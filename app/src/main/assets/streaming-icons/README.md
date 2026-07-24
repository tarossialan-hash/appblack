Ícones quadrados (estilo app icon) usados na sidebar da tela de catálogo de cada
streaming (`#provider-sidebar-logo`). Diferente da pasta `streaming-logos/`
(logo largo usado no card "Escolha seu Streaming" da home) — aqui é só o ícone
quadrado, menor, mostrado no topo da barra lateral quando você entra na tela do
serviço.

Nomes de arquivo esperados (case-sensitive):

- netflix.png
- primevideo.png
- appletv.png
- crunchyroll.png
- disneyplus.png
- globoplay.png
- hbomax.png
- paramountplus.png

Formato livre (.png, .webp ou .jpg) — se usar extensão diferente, ajuste o
`onclick="abrirProviderScreen(...)"` correspondente em index.html (seção
"Escolha seu Streaming"). Ícone ausente não quebra nada — o `<img>` da sidebar
só fica vazio.
