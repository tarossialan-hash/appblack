package com.black.pro.data.remote

import com.black.pro.data.model.*
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface TmdbService {
    @GET("trending/movie/week")
    suspend fun getTrendingMovies(
        @Query("api_key") apiKey: String,
        @Query("language") language: String = "pt-BR"
    ): TmdbResponse<TmdbMovie>

    @GET("search/multi")
    suspend fun searchMulti(
        @Query("api_key") apiKey: String,
        @Query("query") query: String,
        @Query("language") language: String = "pt-BR"
    ): TmdbResponse<TmdbSearchResult>

    @GET("movie/{movie_id}/images")
    suspend fun getMovieImages(
        @Path("movie_id") movieId: Int,
        @Query("api_key") apiKey: String,
        @Query("include_image_language") includeImageLanguage: String = "pt,en,null,tr,es,fr,it,de,ja,ko,ru,zh"
    ): TmdbImagesResponse

    @GET("tv/{tv_id}/images")
    suspend fun getTvImages(
        @Path("tv_id") tvId: Int,
        @Query("api_key") apiKey: String,
        @Query("include_image_language") includeImageLanguage: String = "pt,en,null,tr,es,fr,it,de,ja,ko,ru,zh"
    ): TmdbImagesResponse

    @GET("genre/movie/list")
    suspend fun getMovieGenres(
        @Query("api_key") apiKey: String,
        @Query("language") language: String = "pt-BR"
    ): TmdbGenresResponse

    @GET("movie/{movie_id}")
    suspend fun getMovieDetails(
        @Path("movie_id") movieId: Int,
        @Query("api_key") apiKey: String,
        @Query("language") language: String = "pt-BR",
        @Query("append_to_response") appendToResponse: String = "credits"
    ): TmdbMovieDetails

    @GET("tv/{tv_id}")
    suspend fun getTvDetails(
        @Path("tv_id") tvId: Int,
        @Query("api_key") apiKey: String,
        @Query("language") language: String = "pt-BR",
        @Query("append_to_response") appendToResponse: String = "credits"
    ): TmdbTvDetails

    @GET("movie/{movie_id}/release_dates")
    suspend fun getMovieReleaseDates(
        @Path("movie_id") movieId: Int,
        @Query("api_key") apiKey: String
    ): TmdbReleaseDatesResponse

    @GET("tv/{tv_id}/content_ratings")
    suspend fun getTvContentRatings(
        @Path("tv_id") tvId: Int,
        @Query("api_key") apiKey: String
    ): TmdbContentRatingsResponse

    @GET("tv/{tv_id}/season/{season_number}")
    suspend fun getTvSeasonDetails(
        @Path("tv_id") tvId: Int,
        @Path("season_number") seasonNumber: Int,
        @Query("api_key") apiKey: String,
        @Query("language") language: String = "pt-BR"
    ): TmdbSeasonDetails
}
