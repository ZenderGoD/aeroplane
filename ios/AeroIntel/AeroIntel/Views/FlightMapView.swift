import SwiftUI
import MapKit

struct FlightMapView: View {
    @ObservedObject var viewModel: FlightMapViewModel
    @State private var showFilters = false

    var body: some View {
        NavigationStack {
            ZStack(alignment: .topTrailing) {
                FlightMapRepresentable(
                    flights: viewModel.flightsWithCoordinates,
                    region: $viewModel.mapRegion,
                    radiusCenter: viewModel.radiusSearchCenter,
                    onRegionChanged: { region in
                        viewModel.regionDidChange(region)
                    },
                    onFlightTapped: { flight in
                        viewModel.selectFlight(flight)
                    },
                    onLongPress: { coordinate in
                        viewModel.setRadiusSearch(at: coordinate)
                    }
                )
                .ignoresSafeArea(edges: .top)

                VStack(spacing: 12) {
                    // Filter button
                    Button {
                        showFilters.toggle()
                    } label: {
                        Image(systemName: "line.3.horizontal.decrease.circle.fill")
                            .font(.title2)
                            .foregroundStyle(Theme.textPrimary)
                            .padding(10)
                            .background(Theme.cardBackground.opacity(0.9))
                            .clipShape(Circle())
                    }

                    // Clear radius search
                    if viewModel.isRadiusSearch {
                        Button {
                            viewModel.clearRadiusSearch()
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.title2)
                                .foregroundStyle(.red)
                                .padding(10)
                                .background(Theme.cardBackground.opacity(0.9))
                                .clipShape(Circle())
                        }
                    }
                }
                .padding(.top, 60)
                .padding(.trailing, 16)

                // Flight count overlay
                VStack {
                    Spacer()
                    HStack {
                        flightCountBadge
                        Spacer()
                        if viewModel.isLoading {
                            ProgressView()
                                .tint(Theme.accentSlate)
                                .padding(10)
                                .background(Theme.cardBackground.opacity(0.9))
                                .clipShape(Capsule())
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 8)
                }
            }
            .navigationTitle("AeroIntel")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Theme.background, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .sheet(isPresented: $viewModel.showDetailSheet) {
                if let flight = viewModel.selectedFlight {
                    FlightDetailView(flight: flight) {
                        viewModel.centerOnFlight(flight)
                    }
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
                    .presentationBackground(Theme.background)
                }
            }
            .sheet(isPresented: $showFilters) {
                filterSheet
                    .presentationDetents([.medium])
                    .presentationDragIndicator(.visible)
                    .presentationBackground(Theme.background)
            }
            .task {
                await viewModel.fetchFlights()
            }
        }
    }

    private var flightCountBadge: some View {
        HStack(spacing: 6) {
            Image(systemName: "airplane")
                .font(.caption)
            Text("\(viewModel.filteredFlights.count) flights")
                .font(.caption)
                .fontWeight(.medium)
        }
        .foregroundStyle(Theme.textPrimary)
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Theme.cardBackground.opacity(0.9))
        .clipShape(Capsule())
    }

    private var filterSheet: some View {
        NavigationStack {
            Form {
                Section("Altitude (ft)") {
                    HStack {
                        Text("Min: \(Int(viewModel.minAltitude))")
                            .foregroundStyle(Theme.textSecondary)
                            .font(.caption)
                        Spacer()
                        Text("Max: \(Int(viewModel.maxAltitude))")
                            .foregroundStyle(Theme.textSecondary)
                            .font(.caption)
                    }
                    Slider(value: $viewModel.minAltitude, in: 0...50000, step: 1000)
                        .tint(Theme.accentSlate)
                    Slider(value: $viewModel.maxAltitude, in: 0...50000, step: 1000)
                        .tint(Theme.accentSlate)
                }

                Section("Speed (kts)") {
                    HStack {
                        Text("Min: \(Int(viewModel.minSpeed))")
                            .foregroundStyle(Theme.textSecondary)
                            .font(.caption)
                        Spacer()
                    }
                    Slider(value: $viewModel.minSpeed, in: 0...600, step: 10)
                        .tint(Theme.accentSlate)
                }

                Section("Status") {
                    Toggle("Show on-ground aircraft", isOn: $viewModel.showOnGround)
                        .tint(Theme.accentSlate)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.background)
            .navigationTitle("Filters")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        showFilters = false
                    }
                    .foregroundStyle(Theme.accentSlate)
                }
            }
        }
    }
}

// MARK: - MKMapView UIViewRepresentable

struct FlightMapRepresentable: UIViewRepresentable {
    let flights: [Flight]
    @Binding var region: MKCoordinateRegion
    let radiusCenter: CLLocationCoordinate2D?
    let onRegionChanged: (MKCoordinateRegion) -> Void
    let onFlightTapped: (Flight) -> Void
    let onLongPress: (CLLocationCoordinate2D) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    func makeUIView(context: Context) -> MKMapView {
        let mapView = MKMapView()
        mapView.delegate = context.coordinator
        mapView.mapType = .mutedStandard
        mapView.overrideUserInterfaceStyle = .dark
        mapView.showsUserLocation = true
        mapView.showsCompass = true
        mapView.showsScale = true
        mapView.setRegion(region, animated: false)

        // Long press gesture
        let longPress = UILongPressGestureRecognizer(
            target: context.coordinator,
            action: #selector(Coordinator.handleLongPress(_:))
        )
        longPress.minimumPressDuration = 0.5
        mapView.addGestureRecognizer(longPress)

        return mapView
    }

    func updateUIView(_ mapView: MKMapView, context: Context) {
        context.coordinator.parent = self

        // Update annotations
        let existingAnnotations = mapView.annotations.compactMap { $0 as? FlightAnnotation }
        let existingIds = Set(existingAnnotations.map(\.flightId))
        let newIds = Set(flights.map(\.icao24))

        // Remove stale
        let toRemove = existingAnnotations.filter { !newIds.contains($0.flightId) }
        mapView.removeAnnotations(toRemove)

        // Add new or update existing
        for flight in flights {
            guard let coord = flight.coordinate else { continue }

            if let existing = existingAnnotations.first(where: { $0.flightId == flight.icao24 }) {
                UIView.animate(withDuration: 0.3) {
                    existing.coordinate = coord
                }
                existing.flight = flight
                if let view = mapView.view(for: existing) as? FlightAnnotationUIView {
                    view.updateFlight(flight)
                }
            } else {
                let annotation = FlightAnnotation(flight: flight)
                mapView.addAnnotation(annotation)
            }
        }

        // Update radius overlay
        mapView.removeOverlays(mapView.overlays)
        if let center = radiusCenter {
            let radiusMeters = 50 * 1852.0 // 50 nautical miles
            let circle = MKCircle(center: center, radius: radiusMeters)
            mapView.addOverlay(circle)

            // Add center pin
            let pin = MKPointAnnotation()
            pin.coordinate = center
            pin.title = "Search Center"
            // Remove old pins
            let oldPins = mapView.annotations.compactMap { $0 as? MKPointAnnotation }
            mapView.removeAnnotations(oldPins)
            mapView.addAnnotation(pin)
        } else {
            let oldPins = mapView.annotations.compactMap { $0 as? MKPointAnnotation }
            mapView.removeAnnotations(oldPins)
        }
    }

    class Coordinator: NSObject, MKMapViewDelegate {
        var parent: FlightMapRepresentable

        init(parent: FlightMapRepresentable) {
            self.parent = parent
        }

        @objc func handleLongPress(_ gesture: UILongPressGestureRecognizer) {
            guard gesture.state == .began else { return }
            guard let mapView = gesture.view as? MKMapView else { return }
            let point = gesture.location(in: mapView)
            let coordinate = mapView.convert(point, toCoordinateFrom: mapView)
            parent.onLongPress(coordinate)
        }

        func mapView(_ mapView: MKMapView, regionDidChangeAnimated animated: Bool) {
            parent.onRegionChanged(mapView.region)
        }

        func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
            if annotation is MKUserLocation { return nil }

            if let flightAnnotation = annotation as? FlightAnnotation {
                let identifier = "FlightAnnotation"
                let view: FlightAnnotationUIView
                if let dequeued = mapView.dequeueReusableAnnotationView(withIdentifier: identifier) as? FlightAnnotationUIView {
                    view = dequeued
                    view.annotation = flightAnnotation
                } else {
                    view = FlightAnnotationUIView(annotation: flightAnnotation, reuseIdentifier: identifier)
                }
                view.updateFlight(flightAnnotation.flight)
                return view
            }

            if annotation is MKPointAnnotation {
                let identifier = "CenterPin"
                let view = mapView.dequeueReusableAnnotationView(withIdentifier: identifier) as? MKMarkerAnnotationView
                    ?? MKMarkerAnnotationView(annotation: annotation, reuseIdentifier: identifier)
                view.annotation = annotation
                view.markerTintColor = .systemBlue
                view.glyphImage = UIImage(systemName: "scope")
                return view
            }

            return nil
        }

        func mapView(_ mapView: MKMapView, didSelect annotation: MKAnnotation) {
            mapView.deselectAnnotation(annotation, animated: false)
            if let flightAnnotation = annotation as? FlightAnnotation {
                parent.onFlightTapped(flightAnnotation.flight)
            }
        }

        func mapView(_ mapView: MKMapView, rendererFor overlay: MKOverlay) -> MKOverlayRenderer {
            if let circle = overlay as? MKCircle {
                let renderer = MKCircleRenderer(circle: circle)
                renderer.fillColor = UIColor.systemBlue.withAlphaComponent(0.08)
                renderer.strokeColor = UIColor.systemBlue.withAlphaComponent(0.4)
                renderer.lineWidth = 1.5
                return renderer
            }
            return MKOverlayRenderer(overlay: overlay)
        }
    }
}

// MARK: - Flight Annotation

final class FlightAnnotation: NSObject, MKAnnotation {
    var flight: Flight
    dynamic var coordinate: CLLocationCoordinate2D

    var flightId: String { flight.icao24 }

    var title: String? { flight.displayCallsign }
    var subtitle: String? {
        if let alt = flight.altitudeFeet {
            return "\(alt) ft"
        }
        return flight.onGround ? "On Ground" : nil
    }

    init(flight: Flight) {
        self.flight = flight
        self.coordinate = flight.coordinate ?? CLLocationCoordinate2D()
        super.init()
    }
}
