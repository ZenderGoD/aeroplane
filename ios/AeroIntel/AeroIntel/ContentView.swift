import SwiftUI

struct ContentView: View {
    @StateObject private var mapViewModel = FlightMapViewModel()
    @StateObject private var locationService = LocationService()

    var body: some View {
        TabView {
            FlightMapView(viewModel: mapViewModel)
                .tabItem {
                    Label("Map", systemImage: "map.fill")
                }

            FlightListView(viewModel: mapViewModel)
                .tabItem {
                    Label("List", systemImage: "list.bullet")
                }

            SearchView(mapViewModel: mapViewModel)
                .tabItem {
                    Label("Search", systemImage: "magnifyingglass")
                }
        }
        .tint(Theme.accentSlate)
        .preferredColorScheme(.dark)
        .onAppear {
            configureTabBarAppearance()
            locationService.requestPermission()
        }
        .environmentObject(locationService)
    }

    private func configureTabBarAppearance() {
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(Theme.background)

        appearance.stackedLayoutAppearance.normal.iconColor = UIColor(Theme.textSecondary)
        appearance.stackedLayoutAppearance.normal.titleTextAttributes = [
            .foregroundColor: UIColor(Theme.textSecondary)
        ]
        appearance.stackedLayoutAppearance.selected.iconColor = UIColor(Theme.accentSlate)
        appearance.stackedLayoutAppearance.selected.titleTextAttributes = [
            .foregroundColor: UIColor(Theme.accentSlate)
        ]

        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }
}
