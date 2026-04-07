import SwiftUI

struct SearchView: View {
    @ObservedObject var mapViewModel: FlightMapViewModel
    @State private var searchText = ""
    @State private var searchResults: [Flight] = []
    @State private var isSearching = false
    @State private var errorMessage: String?
    @State private var hasSearched = false

    @AppStorage("recentSearches") private var recentSearchesData: Data = Data()

    private var recentSearches: [String] {
        (try? JSONDecoder().decode([String].self, from: recentSearchesData)) ?? []
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search bar
                searchBar
                    .padding()

                Divider().overlay(Theme.border)

                if isSearching {
                    Spacer()
                    ProgressView("Searching...")
                        .tint(Theme.accentSlate)
                        .foregroundStyle(Theme.textSecondary)
                    Spacer()
                } else if let error = errorMessage {
                    errorView(error)
                } else if hasSearched && searchResults.isEmpty {
                    noResultsView
                } else if !hasSearched {
                    recentSearchesList
                } else {
                    resultsList
                }
            }
            .background(Theme.background)
            .navigationTitle("Search")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Theme.background, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .sheet(isPresented: $mapViewModel.showDetailSheet) {
                if let flight = mapViewModel.selectedFlight {
                    FlightDetailView(flight: flight) {
                        mapViewModel.centerOnFlight(flight)
                    }
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
                    .presentationBackground(Theme.background)
                }
            }
        }
    }

    private var searchBar: some View {
        HStack(spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(Theme.textSecondary)

                TextField("Search callsign or flight number", text: $searchText)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .foregroundStyle(Theme.textPrimary)
                    .submitLabel(.search)
                    .onSubmit {
                        performSearch()
                    }

                if !searchText.isEmpty {
                    Button {
                        searchText = ""
                        searchResults = []
                        hasSearched = false
                        errorMessage = nil
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(Theme.textSecondary)
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Theme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 10))

            if !searchText.isEmpty {
                Button("Search") {
                    performSearch()
                }
                .foregroundStyle(Theme.accentSlate)
                .fontWeight(.semibold)
            }
        }
    }

    private var recentSearchesList: some View {
        Group {
            if recentSearches.isEmpty {
                VStack(spacing: 16) {
                    Spacer()
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 48))
                        .foregroundStyle(Theme.textSecondary.opacity(0.5))
                    Text("Search for flights")
                        .font(.headline)
                        .foregroundStyle(Theme.textSecondary)
                    Text("Enter a callsign or flight number")
                        .font(.subheadline)
                        .foregroundStyle(Theme.textSecondary.opacity(0.7))
                    Spacer()
                }
            } else {
                List {
                    Section {
                        ForEach(recentSearches, id: \.self) { query in
                            Button {
                                searchText = query
                                performSearch()
                            } label: {
                                HStack {
                                    Image(systemName: "clock.arrow.circlepath")
                                        .foregroundStyle(Theme.textSecondary)
                                    Text(query)
                                        .foregroundStyle(Theme.textPrimary)
                                    Spacer()
                                }
                            }
                            .listRowBackground(Theme.cardBackground)
                        }
                    } header: {
                        HStack {
                            Text("Recent Searches")
                                .foregroundStyle(Theme.textSecondary)
                            Spacer()
                            Button("Clear") {
                                clearRecentSearches()
                            }
                            .font(.caption)
                            .foregroundStyle(Theme.accentSlate)
                        }
                    }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
            }
        }
    }

    private var resultsList: some View {
        List(searchResults) { flight in
            FlightRow(flight: flight)
                .listRowBackground(Theme.cardBackground)
                .listRowSeparatorTint(Theme.border)
                .onTapGesture {
                    mapViewModel.selectFlight(flight)
                }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundStyle(.orange)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(Theme.textSecondary)
                .multilineTextAlignment(.center)
            Button("Retry") {
                performSearch()
            }
            .foregroundStyle(Theme.accentSlate)
            Spacer()
        }
        .padding()
    }

    private var noResultsView: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "magnifyingglass")
                .font(.system(size: 48))
                .foregroundStyle(Theme.textSecondary.opacity(0.5))
            Text("No results found")
                .font(.headline)
                .foregroundStyle(Theme.textSecondary)
            Text("Try a different callsign or flight number")
                .font(.subheadline)
                .foregroundStyle(Theme.textSecondary.opacity(0.7))
            Spacer()
        }
    }

    // MARK: - Actions

    private func performSearch() {
        let query = searchText.trimmingCharacters(in: .whitespaces)
        guard !query.isEmpty else { return }

        saveRecentSearch(query)

        isSearching = true
        hasSearched = true
        errorMessage = nil

        Task {
            do {
                searchResults = try await FlightService.shared.searchFlights(query: query)
            } catch {
                errorMessage = error.localizedDescription
            }
            isSearching = false
        }
    }

    private func saveRecentSearch(_ query: String) {
        var searches = recentSearches
        searches.removeAll { $0.lowercased() == query.lowercased() }
        searches.insert(query.uppercased(), at: 0)
        if searches.count > 10 {
            searches = Array(searches.prefix(10))
        }
        recentSearchesData = (try? JSONEncoder().encode(searches)) ?? Data()
    }

    private func clearRecentSearches() {
        recentSearchesData = (try? JSONEncoder().encode([String]())) ?? Data()
    }
}
