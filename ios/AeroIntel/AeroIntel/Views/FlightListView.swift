import SwiftUI

enum FlightSortKey: String, CaseIterable {
    case callsign = "Callsign"
    case altitude = "Altitude"
    case speed = "Speed"
    case origin = "Origin"
}

struct FlightListView: View {
    @ObservedObject var viewModel: FlightMapViewModel
    @State private var sortKey: FlightSortKey = .callsign
    @State private var sortAscending = true

    var sortedFlights: [Flight] {
        let flights = viewModel.filteredFlights
        return flights.sorted { a, b in
            let result: Bool
            switch sortKey {
            case .callsign:
                result = a.displayCallsign.localizedCompare(b.displayCallsign) == .orderedAscending
            case .altitude:
                result = (a.altitudeFeet ?? 0) < (b.altitudeFeet ?? 0)
            case .speed:
                result = (a.speedKnots ?? 0) < (b.speedKnots ?? 0)
            case .origin:
                result = a.originCountry.localizedCompare(b.originCountry) == .orderedAscending
            }
            return sortAscending ? result : !result
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Sort bar
                sortBar
                    .padding(.horizontal)
                    .padding(.vertical, 8)
                    .background(Theme.background)

                Divider().overlay(Theme.border)

                if viewModel.filteredFlights.isEmpty {
                    emptyState
                } else {
                    List(sortedFlights) { flight in
                        FlightRow(flight: flight)
                            .listRowBackground(Theme.cardBackground)
                            .listRowSeparatorTint(Theme.border)
                            .onTapGesture {
                                viewModel.selectFlight(flight)
                            }
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                    .refreshable {
                        await viewModel.fetchFlights()
                    }
                }
            }
            .background(Theme.background)
            .navigationTitle("Flights")
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
        }
    }

    private var sortBar: some View {
        HStack(spacing: 12) {
            Text("Sort by:")
                .font(.caption)
                .foregroundStyle(Theme.textSecondary)

            ForEach(FlightSortKey.allCases, id: \.self) { key in
                Button {
                    if sortKey == key {
                        sortAscending.toggle()
                    } else {
                        sortKey = key
                        sortAscending = true
                    }
                } label: {
                    HStack(spacing: 2) {
                        Text(key.rawValue)
                            .font(.caption)
                            .fontWeight(sortKey == key ? .bold : .regular)
                        if sortKey == key {
                            Image(systemName: sortAscending ? "chevron.up" : "chevron.down")
                                .font(.system(size: 8, weight: .bold))
                        }
                    }
                    .foregroundStyle(sortKey == key ? Theme.accentSlate : Theme.textSecondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(
                        sortKey == key
                            ? Theme.accentSlate.opacity(0.15)
                            : Color.clear
                    )
                    .clipShape(Capsule())
                }
            }

            Spacer()

            Text("\(viewModel.filteredFlights.count)")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(Theme.textSecondary)
                .fontDesign(.monospaced)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "airplane")
                .font(.system(size: 48))
                .foregroundStyle(Theme.textSecondary.opacity(0.5))
            Text("No flights in view")
                .font(.headline)
                .foregroundStyle(Theme.textSecondary)
            Text("Pan the map to load flights in a new area")
                .font(.subheadline)
                .foregroundStyle(Theme.textSecondary.opacity(0.7))
            Spacer()
        }
    }
}
