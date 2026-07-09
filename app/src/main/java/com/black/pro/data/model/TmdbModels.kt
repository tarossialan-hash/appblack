package com.black.pro.data.model

import com.google.gson.annotations.SerializedName

data class TmdbResponse<T>(
    @SerializedName("results") val results: List<T>
)

data class TmdbMovie(
    @SerializedName("id") val id: Int,
    @SerializedName("title") val title: String,
    @SerializedName("overview") val overview: String,
    @SerializedName("backdrop_path") val backdropPath: String?,
    @SerializedName("release_date") val releaseDate: String?,
    @SerializedName("vote_average") val voteAverage: Double,
    @SerializedName("genre_ids") val genreIds: List<Int>
)

data class TmdbImagesResponse(
    @SerializedName("logos") val logos: List<TmdbImage>
)

data class TmdbImage(
    @SerializedName("file_path") val filePath: String
)

data class TmdbSearchResult(
    @SerializedName("id") val id: Int,
    @SerializedName("media_type") val mediaType: String?,
    @SerializedName("title") val title: String?,
    @SerializedName("name") val name: String?,
    @SerializedName("overview") val overview: String?,
    @SerializedName("backdrop_path") val backdropPath: String?,
    @SerializedName("release_date") val releaseDate: String?,
    @SerializedName("first_air_date") val firstAirDate: String?,
    @SerializedName("vote_average") val voteAverage: Double,
    @SerializedName("genre_ids") val genreIds: List<Int>?,
    @SerializedName("adult") val adult: Boolean? = false
)

data class TmdbBannerItem(
    val id: Int,
    val title: String,
    val overview: String,
    val backdropPath: String,
    val logoPath: String?,
    val releaseYear: String,
    val voteAverage: Double,
    val genreIds: List<Int>,
    val mediaType: String,
    val runtime: String? = null,
    val ageRating: String? = null
)

// Data classes for Age Ratings
data class TmdbReleaseDatesResponse(
    @SerializedName("results") val results: List<TmdbReleaseDateResult>
)

data class TmdbReleaseDateResult(
    @SerializedName("iso_3166_1") val countryCode: String,
    @SerializedName("release_dates") val releaseDates: List<TmdbReleaseDateInfo>
)

data class TmdbReleaseDateInfo(
    @SerializedName("certification") val certification: String
)

data class TmdbContentRatingsResponse(
    @SerializedName("results") val results: List<TmdbContentRatingResult>
)

data class TmdbContentRatingResult(
    @SerializedName("iso_3166_1") val countryCode: String,
    @SerializedName("rating") val rating: String
)

data class TmdbMovieDetails(
    @SerializedName("id") val id: Int,
    @SerializedName("title") val title: String,
    @SerializedName("original_title") val originalTitle: String?,
    @SerializedName("overview") val overview: String,
    @SerializedName("backdrop_path") val backdropPath: String?,
    @SerializedName("poster_path") val posterPath: String?,
    @SerializedName("release_date") val releaseDate: String?,
    @SerializedName("vote_average") val voteAverage: Double,
    @SerializedName("runtime") val runtime: Int?,
    @SerializedName("genres") val genres: List<TmdbGenre>?,
    @SerializedName("credits") val credits: TmdbCredits?,
    var logoPath: String? = null
)

data class TmdbTvDetails(
    @SerializedName("id") val id: Int,
    @SerializedName("name") val name: String,
    @SerializedName("original_name") val originalName: String?,
    @SerializedName("overview") val overview: String,
    @SerializedName("backdrop_path") val backdropPath: String?,
    @SerializedName("poster_path") val posterPath: String?,
    @SerializedName("first_air_date") val firstAirDate: String?,
    @SerializedName("vote_average") val voteAverage: Double,
    @SerializedName("episode_run_time") val episodeRunTime: List<Int>?,
    @SerializedName("genres") val genres: List<TmdbGenre>?,
    @SerializedName("credits") val credits: TmdbCredits?,
    @SerializedName("seasons") val seasons: List<TmdbSeason>?,
    @SerializedName("created_by") val createdBy: List<TmdbCreator>?,
    var logoPath: String? = null
)

data class TmdbCreator(
    @SerializedName("name") val name: String
)

data class TmdbSeason(
    @SerializedName("id") val id: Int,
    @SerializedName("name") val name: String,
    @SerializedName("season_number") val seasonNumber: Int,
    @SerializedName("episode_count") val episodeCount: Int,
    @SerializedName("poster_path") val posterPath: String?
)

data class TmdbSeasonDetails(
    @SerializedName("id") val id: Int,
    @SerializedName("name") val name: String,
    @SerializedName("episodes") val episodes: List<TmdbEpisode>
)

data class TmdbEpisode(
    @SerializedName("id") val id: Int,
    @SerializedName("name") val name: String,
    @SerializedName("overview") val overview: String,
    @SerializedName("episode_number") val episodeNumber: Int,
    @SerializedName("season_number") val seasonNumber: Int,
    @SerializedName("still_path") val stillPath: String?,
    @SerializedName("runtime") val runtime: Int?,
    @SerializedName("vote_average") val voteAverage: Double?
)

data class TmdbCredits(
    @SerializedName("cast") val cast: List<TmdbCast>?,
    @SerializedName("crew") val crew: List<TmdbCrew>?
)

data class TmdbCast(
    @SerializedName("name") val name: String
)

data class TmdbCrew(
    @SerializedName("name") val name: String,
    @SerializedName("job") val job: String
)

data class TmdbGenresResponse(
    @SerializedName("genres") val genres: List<TmdbGenre>
)

data class TmdbGenre(
    @SerializedName("id") val id: Int,
    @SerializedName("name") val name: String
)
