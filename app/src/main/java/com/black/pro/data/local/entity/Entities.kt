package com.black.pro.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey val categoryId: String,
    val categoryName: String,
    val parentId: Int,
    val type: String // "live", "movie", "series"
)

@Entity(tableName = "live_streams")
data class LiveStreamEntity(
    @PrimaryKey val streamId: Int,
    val num: Int,
    val name: String,
    val streamType: String,
    val streamIcon: String?,
    val categoryId: String?
)

/*
 * Chave composta (streamId + categoryId), e não streamId sozinho.
 * O provedor relista o mesmo filme em categorias curadas ("EM ALTA",
 * "LANÇAMENTOS"). Com streamId como chave única, o Room substituía o
 * registro a cada repetição e categorias inteiras ficavam vazias.
 */
@Entity(tableName = "movies", primaryKeys = ["streamId", "categoryId"])
data class MovieEntity(
    val streamId: Int,
    val num: Int,
    val name: String,
    val streamIcon: String?,
    val rating: String?,
    val categoryId: String,
    val containerExtension: String?,
    // Guardado para ordenar por recem-adicionados
    val added: Long = 0
)

@Entity(tableName = "series", primaryKeys = ["seriesId", "categoryId"])
data class SeriesEntity(
    val seriesId: Int,
    val num: Int,
    val name: String,
    val cover: String?,
    val rating: String?,
    val categoryId: String,
    val added: Long = 0
)
