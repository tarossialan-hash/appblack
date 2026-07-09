package com.black.pro.data.local.dao

import androidx.room.*
import com.black.pro.data.local.entity.*
import kotlinx.coroutines.flow.Flow

@Dao
interface IPTVDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCategories(categories: List<CategoryEntity>)

    @Query("SELECT * FROM categories WHERE type = :type")
    fun getCategoriesByType(type: String): Flow<List<CategoryEntity>>

    @Query("DELETE FROM categories")
    suspend fun clearCategories()

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLiveStreams(streams: List<LiveStreamEntity>)

    @Query("SELECT * FROM live_streams WHERE categoryId = :categoryId")
    fun getLiveStreamsByCategory(categoryId: String): Flow<List<LiveStreamEntity>>

    @Query("DELETE FROM live_streams")
    suspend fun clearLiveStreams()

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMovies(movies: List<MovieEntity>)

    @Query("SELECT * FROM movies WHERE categoryId = :categoryId")
    fun getMoviesByCategory(categoryId: String): Flow<List<MovieEntity>>

    @Query("SELECT * FROM movies ORDER BY streamId DESC LIMIT 20")
    fun getRecentMovies(): Flow<List<MovieEntity>>

    @Query("DELETE FROM movies")
    suspend fun clearMovies()

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSeries(series: List<SeriesEntity>)

    @Query("SELECT * FROM series WHERE categoryId = :categoryId")
    fun getSeriesByCategory(categoryId: String): Flow<List<SeriesEntity>>

    @Query("SELECT * FROM series ORDER BY seriesId DESC LIMIT 20")
    fun getRecentSeries(): Flow<List<SeriesEntity>>

    @Query("DELETE FROM series")
    suspend fun clearSeries()
    
    @Transaction
    suspend fun clearAll() {
        clearCategories()
        clearLiveStreams()
        clearMovies()
        clearSeries()
    }
}
