import Foundation
import CoreLocation

struct Flight: Codable, Identifiable, Equatable {
    let icao24: String
    let callsign: String?
    let originCountry: String
    let latitude: Double?
    let longitude: Double?
    let baroAltitude: Double?
    let onGround: Bool
    let velocity: Double?
    let trueTrack: Double?
    let verticalRate: Double?
    let geoAltitude: Double?
    let squawk: String?
    let category: Int
    let registration: String?
    let typeCode: String?

    var id: String { icao24 }

    var coordinate: CLLocationCoordinate2D? {
        guard let latitude, let longitude else { return nil }
        return CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    // Altitude in feet (converted from meters)
    var altitudeFeet: Int? {
        guard let baroAltitude else { return nil }
        return Int(baroAltitude * 3.28084)
    }

    // Speed in knots (converted from m/s)
    var speedKnots: Int? {
        guard let velocity else { return nil }
        return Int(velocity * 1.94384)
    }

    // Vertical rate in feet per minute (converted from m/s)
    var verticalRateFPM: Int? {
        guard let verticalRate else { return nil }
        return Int(verticalRate * 196.85)
    }

    // Heading rounded to nearest degree
    var headingDegrees: Int? {
        guard let trueTrack else { return nil }
        return Int(trueTrack.rounded())
    }

    // Display callsign (trimmed, or fallback to icao24)
    var displayCallsign: String {
        let trimmed = callsign?.trimmingCharacters(in: .whitespaces) ?? ""
        return trimmed.isEmpty ? icao24.uppercased() : trimmed
    }

    // Altitude category for color coding (0.0 = ground, 1.0 = high altitude)
    var altitudeNormalized: Double {
        guard let alt = baroAltitude, !onGround else { return 0.0 }
        // Normalize between 0 and 45000 feet (~13716 meters)
        return min(max(alt / 13716.0, 0.0), 1.0)
    }

    static func == (lhs: Flight, rhs: Flight) -> Bool {
        lhs.icao24 == rhs.icao24
    }
}
