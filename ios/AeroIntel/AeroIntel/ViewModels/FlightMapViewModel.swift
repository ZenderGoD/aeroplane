import Foundation
import MapKit
import Combine

@MainActor
final class FlightMapViewModel: ObservableObject {
    // MARK: - Published state

    @Published var flights: [Flight] = []
    @Published var selectedFlight: Flight?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showDetailSheet = false

    @Published var mapRegion = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 39.8283, longitude: -98.5795),
        span: MKCoordinateSpan(latitudeDelta: 30, longitudeDelta: 30)
    )

    @Published var radiusSearchCenter: CLLocationCoordinate2D?
    @Published var isRadiusSearch = false

    // Filters
    @Published var minAltitude: Double = 0
    @Published var maxAltitude: Double = 50000
    @Published var minSpeed: Double = 0
    @Published var showOnGround: Bool = true

    // MARK: - Private

    private let flightService = FlightService.shared
    private var refreshTimer: Timer?
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Computed

    var filteredFlights: [Flight] {
        flights.filter { flight in
            let altFeet = Double(flight.altitudeFeet ?? 0)
            let speedKts = Double(flight.speedKnots ?? 0)

            let altOk = altFeet >= minAltitude && altFeet <= maxAltitude
            let speedOk = speedKts >= minSpeed
            let groundOk = showOnGround || !flight.onGround

            return altOk && speedOk && groundOk
        }
    }

    var flightsWithCoordinates: [Flight] {
        filteredFlights.filter { $0.coordinate != nil }
    }

    // MARK: - Init

    init() {
        startAutoRefresh()
    }

    deinit {
        refreshTimer?.invalidate()
    }

    // MARK: - Public methods

    func fetchFlights() async {
        isLoading = true
        errorMessage = nil

        do {
            let fetched: [Flight]
            if isRadiusSearch, let center = radiusSearchCenter {
                fetched = try await flightService.fetchFlightsNear(
                    latitude: center.latitude,
                    longitude: center.longitude,
                    radiusNM: 50
                )
            } else {
                fetched = try await flightService.fetchFlights(region: mapRegion)
            }
            flights = fetched
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func selectFlight(_ flight: Flight) {
        selectedFlight = flight
        showDetailSheet = true
    }

    func centerOnFlight(_ flight: Flight) {
        guard let coord = flight.coordinate else { return }
        mapRegion = MKCoordinateRegion(
            center: coord,
            span: MKCoordinateSpan(latitudeDelta: 2, longitudeDelta: 2)
        )
        showDetailSheet = false
    }

    func setRadiusSearch(at coordinate: CLLocationCoordinate2D) {
        radiusSearchCenter = coordinate
        isRadiusSearch = true
        Task {
            await fetchFlights()
        }
    }

    func clearRadiusSearch() {
        radiusSearchCenter = nil
        isRadiusSearch = false
        Task {
            await fetchFlights()
        }
    }

    func regionDidChange(_ region: MKCoordinateRegion) {
        mapRegion = region
        if !isRadiusSearch {
            Task {
                await fetchFlights()
            }
        }
    }

    // MARK: - Auto-refresh

    private func startAutoRefresh() {
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 15, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                await self?.fetchFlights()
            }
        }
    }
}
