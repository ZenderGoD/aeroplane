import Foundation
import SwiftUI

@MainActor
final class FlightDetailViewModel: ObservableObject {
    @Published var flight: Flight
    @Published var photoURL: URL?
    @Published var isLoadingPhoto = false

    private let flightService = FlightService.shared

    init(flight: Flight) {
        self.flight = flight
    }

    func loadPhoto() async {
        isLoadingPhoto = true
        do {
            photoURL = try await flightService.fetchPhotoURL(
                icao24: flight.icao24,
                registration: flight.registration,
                typeCode: flight.typeCode
            )
        } catch {
            photoURL = nil
        }
        isLoadingPhoto = false
    }
}
