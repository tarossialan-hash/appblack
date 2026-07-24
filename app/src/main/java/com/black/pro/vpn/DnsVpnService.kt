package com.black.pro.vpn

import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import android.util.Log
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.SocketTimeoutException
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.concurrent.thread

/**
 * VPN local que troca só a DNS do sistema, sem tunelar o resto do tráfego.
 *
 * Alguns clientes têm DNS de operadora que falha ou bloqueia domínios como o
 * do TMDB (pôsteres/capas não carregam). Como isso afeta a WebView, o OkHttp
 * e o player ao mesmo tempo — cada um com sua própria pilha de rede — só uma
 * correção no nível do sistema (DNS do Android) resolve os três de uma vez.
 *
 * A técnica: registra 192.0.2.2 (endereço reservado pra documentação, RFC
 * 5737 — nunca é um IP real de rede alguma, então não colide com nada) como
 * servidor DNS do Android via addDnsServer(), e só essa rota específica
 * (addRoute) entra no túnel. Todo o resto do tráfego do app continua
 * exatamente como sempre foi, fora da VPN. Cada pacote UDP:53 que chega no
 * túnel é encaminhado de verdade para 1.1.1.1 (e 8.8.8.8 se aquele falhar) e
 * a resposta é remontada e devolvida — o app é, na prática, o próprio
 * resolvedor de DNS do aparelho.
 *
 * addAllowedApplication restringe a VPN só a este app: os outros apps do
 * aparelho (TV box compartilhada) não são afetados.
 */
class DnsVpnService : VpnService() {

    companion object {
        private const val TAG = "DnsVpnService"
        const val ACTION_STOP = "com.black.pro.vpn.STOP"

        private const val TUN_ADDRESS = "192.0.2.1"
        private const val TUN_PREFIX_LENGTH = 24
        private const val DNS_ALIAS = "192.0.2.2"
        private const val DNS_PRIMARY = "1.1.1.1"
        private const val DNS_FALLBACK = "8.8.8.8"
        private const val MTU = 1500
        private const val DNS_TIMEOUT_MS = 2500
    }

    private var vpnInterface: ParcelFileDescriptor? = null
    private val running = AtomicBoolean(false)
    private var resolverPool: ExecutorService? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            pararVpn()
            return START_NOT_STICKY
        }
        iniciarVpn()
        return START_STICKY
    }

    private fun iniciarVpn() {
        if (running.get()) return
        try {
            val builder = Builder()
                .setSession("BLACK - Corrigir DNS")
                .addAddress(TUN_ADDRESS, TUN_PREFIX_LENGTH)
                .addDnsServer(DNS_ALIAS)
                .addRoute(DNS_ALIAS, 32)
                .setMtu(MTU)
                .setBlocking(true)

            try {
                builder.addAllowedApplication(packageName)
            } catch (e: Exception) {
                Log.w(TAG, "Não foi possível restringir a VPN só a este app", e)
            }

            val iface = builder.establish()
            if (iface == null) {
                Log.w(TAG, "establish() retornou null (sem permissão de VPN)")
                stopSelf()
                return
            }
            vpnInterface = iface
            resolverPool = Executors.newFixedThreadPool(4)
            running.set(true)
            thread(name = "DnsVpnReader") { loopLeitura(iface) }
        } catch (e: Exception) {
            Log.e(TAG, "Falha ao iniciar a VPN de DNS", e)
            pararVpn()
        }
    }

    private fun loopLeitura(iface: ParcelFileDescriptor) {
        val input = FileInputStream(iface.fileDescriptor)
        val output = FileOutputStream(iface.fileDescriptor)
        val buffer = ByteArray(MTU)

        while (running.get()) {
            val length = try {
                input.read(buffer)
            } catch (e: IOException) {
                if (running.get()) Log.w(TAG, "Leitura do túnel interrompida", e)
                break
            }
            if (length <= 0) continue

            val pacote = buffer.copyOfRange(0, length)
            val pool = resolverPool ?: break
            try {
                pool.execute {
                    try {
                        tratarPacote(pacote, output)
                    } catch (e: Exception) {
                        Log.w(TAG, "Pacote de DNS descartado (falha ao processar)", e)
                    }
                }
            } catch (e: Exception) {
                // Pool já foi encerrado (parada em curso) — ignora o pacote.
            }
        }

        try { input.close() } catch (_: Exception) {}
        try { output.close() } catch (_: Exception) {}
    }

    /** Só interessa IPv4/UDP com destino 53 — é a única rota que aponta pro túnel. */
    private fun tratarPacote(pacote: ByteArray, output: FileOutputStream) {
        if (pacote.size < 28) return // menor IPv4(20) + UDP(8) possível

        val versao = (pacote[0].toInt() shr 4) and 0x0F
        if (versao != 4) return

        val ihl = (pacote[0].toInt() and 0x0F) * 4
        val protocolo = pacote[9].toInt() and 0xFF
        if (protocolo != 17) return // só UDP

        val udpOffset = ihl
        if (pacote.size < udpOffset + 8) return

        val portaDestino = lerUint16(pacote, udpOffset + 2)
        if (portaDestino != 53) return
        val portaOrigem = lerUint16(pacote, udpOffset)

        val ipOrigem = pacote.copyOfRange(12, 16)
        val ipDestino = pacote.copyOfRange(16, 20)

        val dnsOffset = udpOffset + 8
        if (pacote.size <= dnsOffset) return
        val consulta = pacote.copyOfRange(dnsOffset, pacote.size)

        val resposta = resolverDns(consulta) ?: return
        val respostaPacote = montarRespostaIpv4Udp(
            ipOrigem = ipDestino, ipDestino = ipOrigem, // quem responde é o alias (era o destino da consulta)
            portaOrigem = portaDestino, portaDestino = portaOrigem,
            payload = resposta
        )
        try {
            synchronized(output) { output.write(respostaPacote) }
        } catch (e: Exception) {
            Log.w(TAG, "Falha ao escrever resposta de DNS no túnel", e)
        }
    }

    /** Ordem escolhida pelo cliente em Config > VPN (o outro servidor vira o fallback). */
    private fun servidoresNaOrdemPreferida(): Array<String> {
        val preferido = getSharedPreferences("black_app_prefs", Context.MODE_PRIVATE)
            .getString("dns_primary", DNS_PRIMARY)
        return if (preferido == DNS_FALLBACK) arrayOf(DNS_FALLBACK, DNS_PRIMARY) else arrayOf(DNS_PRIMARY, DNS_FALLBACK)
    }

    /** Encaminha a consulta pro servidor preferido; cai pro outro se aquele falhar/expirar. */
    private fun resolverDns(consulta: ByteArray): ByteArray? {
        for (servidor in servidoresNaOrdemPreferida()) {
            try {
                DatagramSocket().use { socket ->
                    protect(socket) // não deixa essa consulta entrar de novo no próprio túnel
                    socket.soTimeout = DNS_TIMEOUT_MS
                    val endereco = InetAddress.getByName(servidor)
                    socket.send(DatagramPacket(consulta, consulta.size, endereco, 53))

                    val bufResposta = ByteArray(MTU)
                    val pacoteResposta = DatagramPacket(bufResposta, bufResposta.size)
                    socket.receive(pacoteResposta)
                    return bufResposta.copyOfRange(0, pacoteResposta.length)
                }
            } catch (e: SocketTimeoutException) {
                Log.w(TAG, "Sem resposta de $servidor, tentando o próximo")
            } catch (e: Exception) {
                Log.w(TAG, "Erro consultando $servidor", e)
            }
        }
        return null
    }

    private fun lerUint16(b: ByteArray, offset: Int): Int =
        ((b[offset].toInt() and 0xFF) shl 8) or (b[offset + 1].toInt() and 0xFF)

    private fun escreverUint16(b: ByteArray, offset: Int, valor: Int) {
        b[offset] = ((valor shr 8) and 0xFF).toByte()
        b[offset + 1] = (valor and 0xFF).toByte()
    }

    /** Monta um pacote IPv4 + UDP cru (cabeçalhos + payload) com os checksums corretos. */
    private fun montarRespostaIpv4Udp(
        ipOrigem: ByteArray, ipDestino: ByteArray,
        portaOrigem: Int, portaDestino: Int,
        payload: ByteArray
    ): ByteArray {
        val tamanhoUdp = 8 + payload.size
        val tamanhoTotal = 20 + tamanhoUdp
        val pacote = ByteArray(tamanhoTotal)

        // Cabeçalho IPv4 (20 bytes, sem opções)
        pacote[0] = 0x45 // versão 4, IHL 5
        pacote[1] = 0
        escreverUint16(pacote, 2, tamanhoTotal)
        escreverUint16(pacote, 4, 0) // identification
        escreverUint16(pacote, 6, 0) // flags/fragment offset
        pacote[8] = 64 // TTL
        pacote[9] = 17 // protocolo UDP
        escreverUint16(pacote, 10, 0) // checksum, calculado abaixo
        System.arraycopy(ipOrigem, 0, pacote, 12, 4)
        System.arraycopy(ipDestino, 0, pacote, 16, 4)
        escreverUint16(pacote, 10, checksumInternet(pacote, 0, 20))

        // Cabeçalho UDP
        val udpOffset = 20
        escreverUint16(pacote, udpOffset, portaOrigem)
        escreverUint16(pacote, udpOffset + 2, portaDestino)
        escreverUint16(pacote, udpOffset + 4, tamanhoUdp)
        escreverUint16(pacote, udpOffset + 6, 0) // checksum, calculado abaixo
        System.arraycopy(payload, 0, pacote, udpOffset + 8, payload.size)

        // Checksum UDP usa pseudo-cabeçalho (RFC 768): IPs + protocolo + tamanho UDP
        val pseudo = ByteArray(12 + tamanhoUdp)
        System.arraycopy(ipOrigem, 0, pseudo, 0, 4)
        System.arraycopy(ipDestino, 0, pseudo, 4, 4)
        pseudo[8] = 0
        pseudo[9] = 17
        escreverUint16(pseudo, 10, tamanhoUdp)
        System.arraycopy(pacote, udpOffset, pseudo, 12, tamanhoUdp)

        var checksumUdp = checksumInternet(pseudo, 0, pseudo.size)
        if (checksumUdp == 0) checksumUdp = 0xFFFF // 0 tem significado especial ("sem checksum") em UDP/IPv4
        escreverUint16(pacote, udpOffset + 6, checksumUdp)

        return pacote
    }

    /** Checksum da Internet (RFC 1071): soma em complemento de um de palavras de 16 bits. */
    private fun checksumInternet(dados: ByteArray, offset: Int, length: Int): Int {
        var soma = 0L
        var i = offset
        val fim = offset + length
        while (i + 1 < fim) {
            soma += lerUint16(dados, i)
            i += 2
        }
        if (i < fim) {
            soma += (dados[i].toInt() and 0xFF) shl 8
        }
        while (soma shr 16 != 0L) {
            soma = (soma and 0xFFFF) + (soma shr 16)
        }
        return (soma.inv() and 0xFFFF).toInt()
    }

    private fun pararVpn() {
        running.set(false)
        try { vpnInterface?.close() } catch (_: Exception) {}
        vpnInterface = null
        resolverPool?.shutdownNow()
        resolverPool = null
        stopSelf()
    }

    override fun onDestroy() {
        pararVpn()
        super.onDestroy()
    }

    override fun onRevoke() {
        // O sistema chama isto se o usuário revogar a permissão de VPN pelas
        // Configurações do Android (fora do app) — precisa encerrar do mesmo jeito.
        pararVpn()
        super.onRevoke()
    }
}
