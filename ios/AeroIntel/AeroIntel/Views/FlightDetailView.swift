import SwiftUI

struct FlightDetailView: View {
    let flight: Flight
    let onTrackOnMap: () -> Void

    @StateObject private var viewModel: FlightDetailViewModel

    init(flight: Flight, onTrackOnMap: @escaping () -> Void) {
        self.flight = flight
        self.onTrackOnMap = onTrackOnMap
        _viewModel = StateObject(wrappedValue: FlightDetailViewModel(flight: flight))
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header
                headerSection

                // Photo
                photoSection

                // Stats grid
                statsSection

                // Aircraft info
                aircraftInfoSection

                // Track button
                trackButton
            }
            .padding()
        }
        .background(Theme.background)
        .task {
            await viewModel.loadPhoto()
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: 4) {
            Text(flight.displayCallsign)
                .font(.system(size: 32, weight: .bold, design: .monospaced))
                .foregroundStyle(Theme.textPrimary)

            if flight.onGround {
                Text("ON GROUND")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(Theme.textSecondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Theme.textSecondary.opacity(0.2))
                    .clipShape(Capsule())
            } else {
                HStack(spacing: 4) {
                    Image(systemName: verticalRateIcon)
                        .font(.caption)
                    Text(verticalRateText)
                        .font(.caption)
                        .fontWeight(.medium)
                }
                .foregroundStyle(verticalRateColor)
            }
        }
    }

    private var verticalRateIcon: String {
        guard let vr = flight.verticalRate else { return "arrow.forward" }
        if vr > 0.5 { return "arrow.up.right" }
        if vr < -0.5 { return "arrow.down.right" }
        return "arrow.forward"
    }

    private var verticalRateText: String {
        guard let vr = flight.verticalRateFPM else { return "Level" }
        if abs(vr) < 100 { return "Level" }
        return vr > 0 ? "Climbing \(vr) fpm" : "Descending \(abs(vr)) fpm"
    }

    private var verticalRateColor: Color {
        guard let vr = flight.verticalRate else { return Theme.textSecondary }
        if vr > 0.5 { return .green }
        if vr < -0.5 { return .orange }
        return Theme.textSecondary
    }

    // MARK: - Photo

    private var photoSection: some View {
        Group {
            if viewModel.isLoadingPhoto {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Theme.cardBackground)
                    .frame(height: 180)
                    .overlay {
                        ProgressView()
                            .tint(Theme.accentSlate)
                    }
            } else if let photoURL = viewModel.photoURL {
                AsyncImage(url: photoURL) { phase in
                    switch phase {
                    case .empty:
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Theme.cardBackground)
                            .frame(height: 180)
                            .overlay {
                                ProgressView()
                                    .tint(Theme.accentSlate)
                            }
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(height: 180)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    case .failure:
                        EmptyView()
                    @unknown default:
                        EmptyView()
                    }
                }
            }
        }
    }

    // MARK: - Stats

    private var statsSection: some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible()),
            GridItem(.flexible()),
        ], spacing: 12) {
            StatCard(
                title: "ALTITUDE",
                value: flight.altitudeFeet.map { "\($0)" } ?? "--",
                unit: "ft",
                icon: "arrow.up.to.line"
            )
            StatCard(
                title: "SPEED",
                value: flight.speedKnots.map { "\($0)" } ?? "--",
                unit: "kts",
                icon: "gauge.with.dots.needle.67percent"
            )
            StatCard(
                title: "HEADING",
                value: flight.headingDegrees.map { "\($0)\u{00B0}" } ?? "--",
                unit: "",
                icon: "safari"
            )
            StatCard(
                title: "V/S",
                value: flight.verticalRateFPM.map { "\($0)" } ?? "--",
                unit: "fpm",
                icon: "arrow.up.arrow.down"
            )
            StatCard(
                title: "SQUAWK",
                value: flight.squawk ?? "--",
                unit: "",
                icon: "antenna.radiowaves.left.and.right"
            )
            StatCard(
                title: "GEO ALT",
                value: flight.geoAltitude.map { "\(Int($0 * 3.28084))" } ?? "--",
                unit: "ft",
                icon: "mountain.2"
            )
        }
    }

    // MARK: - Aircraft Info

    private var aircraftInfoSection: some View {
        VStack(spacing: 0) {
            infoRow(label: "Registration", value: flight.registration ?? "Unknown")
            Divider().overlay(Theme.border)
            infoRow(label: "Type Code", value: flight.typeCode ?? "Unknown")
            Divider().overlay(Theme.border)
            infoRow(label: "Origin Country", value: flight.originCountry)
            Divider().overlay(Theme.border)
            infoRow(label: "ICAO24", value: flight.icao24.uppercased())
            Divider().overlay(Theme.border)
            infoRow(label: "Category", value: "\(flight.category)")
        }
        .background(Theme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func infoRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(Theme.textSecondary)
            Spacer()
            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(Theme.textPrimary)
                .fontDesign(.monospaced)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    // MARK: - Track Button

    private var trackButton: some View {
        Button(action: onTrackOnMap) {
            HStack {
                Image(systemName: "location.fill")
                Text("Track on Map")
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Theme.accentSlate)
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
}
