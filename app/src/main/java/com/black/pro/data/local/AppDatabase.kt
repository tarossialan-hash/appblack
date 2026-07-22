package com.black.pro.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.black.pro.data.local.dao.IPTVDao
import com.black.pro.data.local.entity.*

// v3: guarda "added" para ordenar por recem-adicionados
// v2: chave composta em movies/series para não perder títulos relistados
// em categorias curadas (ver comentário em Entities.kt)
@Database(entities = [CategoryEntity::class, LiveStreamEntity::class, MovieEntity::class, SeriesEntity::class], version = 3, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun iptvDao(): IPTVDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "black_iptv_db"
                )
                    // O banco é apenas cache do provedor: em mudança de schema
                    // recriar é mais seguro (e rápido) que migrar — a próxima
                    // sincronização repopula tudo.
                    .fallbackToDestructiveMigration(dropAllTables = true)
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
