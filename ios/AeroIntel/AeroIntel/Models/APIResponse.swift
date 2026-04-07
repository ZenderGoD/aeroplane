import Foundation

struct FlightsResponse: Codable {
    let flights: [Flight]
}

struct SearchResponse: Codable {
    let flights: [Flight]
}

struct MetarResponse: Codable {
    let metar: String?
    let error: String?
}

struct PhotoResponse: Codable {
    let url: String?
    let photographer: String?
    let error: String?
}

enum APIError: LocalizedError {
    case invalidURL
    case networkError(Error)
    case decodingError(Error)
    case serverError(Int)
    case noData

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .decodingError(let error):
            return "Data error: \(error.localizedDescription)"
        case .serverError(let code):
            return "Server error: \(code)"
        case .noData:
            return "No data received"
        }
    }
}
