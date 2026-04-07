import SwiftUI

struct FlightRow: View {
    let flight: Flight

    var body: some View {
        HStack(spacing: 12) {
            // Plane icon with rotation
            Image(systemName: "airplane")
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(altitudeColor)
                .rotationEffect(.degrees(flight.trueTrack ?? 0))
                .frame(width: 32, height: 32)
                .background(altitudeColor.opacity(0.1))
                .clipShape(Circle())

            // Callsign and origin
            VStack(alignment: .leading, spacing: 2) {
                Text(flight.displayCallsign)
                    .font(.system(size: 15, weight: .semibold, design: .monospaced))
                    .foregroundStyle(Theme.textPrimary)

                HStack(spacing: 4) {
                    Text(flight.originCountry)
                        .font(.caption)
                        .foregroundStyle(Theme.textSecondary)

                    if let reg = flight.registration, !reg.isEmpty {
                        Text("--")
                            .font(.caption)
                            .foregroundStyle(Theme.textSecondary.opacity(0.5))
                        Text(reg)
                            .font(.caption)
                            .foregroundStyle(Theme.textSecondary)
                            .fontDesign(.monospaced)
                    }
                }
            }

            Spacer()

            // Stats
            VStack(alignment: .trailing, spacing: 2) {
                if let alt = flight.altitudeFeet {
                    HStack(spacing: 3) {
                        Text("\(alt)")
                            .font(.system(size: 13, weight: .medium, design: .monospaced))
                            .foregroundStyle(Theme.textPrimary)
                        Text("ft")
                            .font(.system(size: 10))
                            .foregroundStyle(Theme.textSecondary)
                    }
                } else if flight.onGround {
                    Text("GND")
                        .font(.system(size: 12, weight: .medium, design: .monospaced))
                        .foregroundStyle(Theme.textSecondary)
                }

                if let spd = flight.speedKnots {
                    HStack(spacing: 3) {
                        Text("\(spd)")
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundStyle(Theme.textSecondary)
                        Text("kts")
                            .font(.system(size: 9))
                            .foregroundStyle(Theme.textSecondary.opacity(0.7))
                    }
                }
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 12))
                .foregroundStyle(Theme.textSecondary.opacity(0.5))
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
    }

    private var altitudeColor: Color {
        let norm = flight.altitudeNormalized
        if flight.onGround {
            return Theme.textSecondary.opacity(0.5)
        }
        // Monochrome slate gradient
        return Color(white: 0.4 + norm * 0.5)
    }
}
