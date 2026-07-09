package com.black.pro.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.black.pro.data.local.dao.IPTVDao
import com.black.pro.data.local.entity.*

@Database(entities = [CategoryEntity::class, LiveStreamEntity::class, MovieEntity::class, SeriesEntity::class], version = 1, exportSchema = false)
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
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
