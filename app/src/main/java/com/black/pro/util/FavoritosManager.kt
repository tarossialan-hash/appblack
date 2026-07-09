package com.black.pro.util

import android.content.Context
import com.black.pro.data.model.Movie
import com.black.pro.data.model.Series
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

data class FavoritoItem(
    val id: Int,
    val titulo: String,
    val posterPath: String?,
    val tipo: String // "movie" or "series"
)

object FavoritosManager {
    private const val KEY_FAVORITOS = "favoritos_list"

    fun toggle(context: Context, item: FavoritoItem) {
        val current = getAll(context).toMutableList()
        if (current.any { it.id == item.id && it.tipo == item.tipo }) {
            current.removeAll { it.id == item.id && it.tipo == item.tipo }
        } else {
            current.add(item)
        }
        save(context, current)
    }

    private fun save(context: Context, lista: List<FavoritoItem>) {
        val prefs = context.getSharedPreferences("black_app_prefs", Context.MODE_PRIVATE)
        val json = Gson().toJson(lista)
        prefs.edit().putString(KEY_FAVORITOS, json).apply()
    }

    fun isFavorito(context: Context, id: Int, tipo: String): Boolean {
        return getAll(context).any { it.id == id && it.tipo == tipo }
    }

    fun getAll(context: Context): List<FavoritoItem> {
        val prefs = context.getSharedPreferences("black_app_prefs", Context.MODE_PRIVATE)
        val json = prefs.getString(KEY_FAVORITOS, "[]")
        return try {
            val type = object : com.google.gson.reflect.TypeToken<List<FavoritoItem>>() {}.type
            Gson().fromJson(json, type)
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun getByTipo(context: Context, tipo: String): List<FavoritoItem> {
        return getAll(context).filter { it.tipo == tipo }
    }
}
