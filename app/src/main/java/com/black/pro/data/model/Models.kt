package com.black.pro.data.model

import com.google.gson.annotations.SerializedName

data class LoginResponse(
    @SerializedName("user_info") val userInfo: UserInfo?,
    @SerializedName("server_info") val serverInfo: ServerInfo?
)

data class UserInfo(
    @SerializedName("username") val username: String,
    @SerializedName("status") val status: String,
    @SerializedName("exp_date") val expDate: String?,
    @SerializedName("is_trial") val isTrial: String?,
    @SerializedName("active_cons") val activeCons: String?,
    @SerializedName("max_connections") val maxConnections: String?
)

data class ServerInfo(
    @SerializedName("url") val url: String?,
    @SerializedName("port") val port: String?,
    @SerializedName("https_port") val httpsPort: String?,
    @SerializedName("server_protocol") val serverProtocol: String?,
    @SerializedName("timezone") val timezone: String?
)

data class Category(
    @SerializedName("category_id") val categoryId: String,
    @SerializedName("category_name") val categoryName: String,
    @SerializedName("parent_id") val parentId: Int
)

data class LiveStream(
    @SerializedName("num") val num: Int,
    @SerializedName("name") val name: String,
    @SerializedName("stream_type") val streamType: String,
    @SerializedName("stream_id") val streamId: Int,
    @SerializedName("stream_icon") val streamIcon: String?,
    @SerializedName("category_id") val categoryId: String?
)

data class Movie(
    @SerializedName("num") val num: Int,
    @SerializedName("name") val name: String,
    @SerializedName("stream_id") val streamId: Int,
    @SerializedName("stream_icon") val streamIcon: String?,
    @SerializedName("rating") val rating: String?,
    @SerializedName("category_id") val categoryId: String?,
    @SerializedName("container_extension") val containerExtension: String?,
    // Timestamp Unix de quando o provedor adicionou o titulo
    @SerializedName("added") val added: String? = null
)

data class Series(
    @SerializedName("num") val num: Int,
    @SerializedName("name") val name: String,
    @SerializedName("series_id") val seriesId: Int,
    @SerializedName("cover") val cover: String?,
    @SerializedName("rating") val rating: String?,
    @SerializedName("category_id") val categoryId: String?,
    @SerializedName("last_modified") val lastModified: String? = null
)

data class EpgResponse(
    @SerializedName("epg_listings") val epgListings: List<EpgListing> = emptyList()
)

data class EpgListing(
    @SerializedName("id") val id: String?,
    @SerializedName("epg_id") val epgId: String?,
    @SerializedName("title") val title: String,
    @SerializedName("start") val start: String?,
    @SerializedName("end") val end: String?,
    @SerializedName("description") val description: String?,
    @SerializedName("start_timestamp") val startTimestamp: String?,
    @SerializedName("end_timestamp") val endTimestamp: String?
)

data class SeriesInfoResponse(
    @SerializedName("episodes") val episodes: Map<String, List<IptvEpisode>>?
)

data class IptvEpisode(
    @SerializedName("id") val id: String,
    @SerializedName("episode_num") val episodeNumber: Int,
    @SerializedName("title") val title: String,
    @SerializedName("container_extension") val containerExtension: String?,
    @SerializedName("info") val info: IptvEpisodeInfo?
)

data class IptvEpisodeInfo(
    @SerializedName("duration") val duration: String?,
    @SerializedName("movie_image") val movieImage: String?
)
