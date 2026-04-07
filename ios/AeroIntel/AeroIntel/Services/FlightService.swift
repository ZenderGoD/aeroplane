import Foundation
import MapKit

actor FlightService {
    static let shared = FlightService()

    private let baseURL = "https://anuragair.com/api"
    private let session: URLSession
    private let decoder: JSONDecoder

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 15
        config.timeoutIntervalForResource = 30
        config.waitsForConnectivity = true
        session = URLSession(configuration: config)

        decoder = JSONDecoder()
    }

    // MARK: - Fetch flights in bounding box

    func fetchFlights(region: MKCoordinateRegion) async throws -> [Flight] {
        let center = region.center
        let span = region.span

        let lamin = center.latitude - span.latitudeDelta / 2
        let lamax = center.latitude + span.latitudeDelta / 2
        let lomin = center.longitude - span.longitudeDelta / 2
        let lomax = center.longitude + span.longitudeDelta / 2

        var components = URLComponents(string: "\(baseURL)/flights")!
        components.queryItems = [
            URLQueryItem(name: "lamin", value: String(format: "%.4f", lamin)),
            URLQueryItem(name: "lamax", value: String(format: "%.4f", lamax)),
            URLQueryItem(name: "lomin", value: String(format: "%.4f", lomin)),
            URLQueryItem(name: "lomax", value: String(format: "%.4f", lomax)),
        ]

        guard let url = components.url else {
            throw APIError.invalidURL
        }

        return try await performFlightsRequest(url: url)
    }

    // MARK: - Fetch flights near a point

    func fetchFlightsNear(latitude: Double, longitude: Double, radiusNM: Double = 50) async throws -> [Flight] {
        var components = URLComponents(string: "\(baseURL)/flights")!
        components.queryItems = [
            URLQueryItem(name: "lat", value: String(format: "%.4f", latitude)),
            URLQueryItem(name: "lon", value: String(format: "%.4f", longitude)),
            URLQueryItem(name: "radius", value: String(format: "%.0f", radiusNM)),
        ]

        guard let url = components.url else {
            throw APIError.invalidURL
        }

        return try await performFlightsRequest(url: url)
    }

    // MARK: - Search flights

    func searchFlights(query: String) async throws -> [Flight] {
        var components = URLComponents(string: "\(baseURL)/search")!
        components.queryItems = [
            URLQueryItem(name: "q", value: query),
        ]

        guard let url = components.url else {
            throw APIError.invalidURL
        }

        return try await performFlightsRequest(url: url)
    }

    // MARK: - Fetch METAR

    func fetchMetar(icao: String) async throws -> String? {
        var components = URLComponents(string: "\(baseURL)/metar")!
        components.queryItems = [
            URLQueryItem(name: "icao", value: icao),
        ]

        guard let url = components.url else {
            throw APIError.invalidURL
        }

        let (data, response) = try await session.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.noData
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(httpResponse.statusCode)
        }

        let metarResponse = try decoder.decode(MetarResponse.self, from: data)
        return metarResponse.metar
    }

    // MARK: - Fetch aircraft photo URL

    func fetchPhotoURL(icao24: String, registration: String?, typeCode: String?) async throws -> URL? {
        var components = URLComponents(string: "\(baseURL)/photo")!
        var queryItems = [URLQueryItem(name: "icao24", value: icao24)]

        if let registration, !registration.isEmpty {
            queryItems.append(URLQueryItem(name: "reg", value: registration))
        }
        if let typeCode, !typeCode.isEmpty {
            queryItems.append(URLQueryItem(name: "type", value: typeCode))
        }

        components.queryItems = queryItems

        guard let url = components.url else {
            throw APIError.invalidURL
        }

        let (data, response) = try await session.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.noData
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(httpResponse.statusCode)
        }

        let photoResponse = try decoder.decode(PhotoResponse.self, from: data)

        if let urlString = photoResponse.url, let photoURL = URL(string: urlString) {
            return photoURL
        }

        return nil
    }

    // MARK: - Private helpers

    private func performFlightsRequest(url: URL) async throws -> [Flight] {
        do {
            let (data, response) = try await session.data(from: url)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.noData
            }

            guard (200...299).contains(httpResponse.statusCode) else {
                throw APIError.serverError(httpResponse.statusCode)
            }

            let flightsResponse = try decoder.decode(FlightsResponse.self, from: data)
            return flightsResponse.flights
        } catch let error as APIError {
            throw error
        } catch let error as DecodingError {
            throw APIError.decodingError(error)
        } catch {
            throw APIError.networkError(error)
        }
    }
}
