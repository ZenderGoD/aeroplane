import SwiftUI

// MARK: - Theme

enum Theme {
    static let background = Color(red: 11/255, green: 17/255, blue: 32/255)          // #0b1120
    static let cardBackground = Color(red: 18/255, green: 26/255, blue: 46/255)      // #121a2e
    static let border = Color(red: 30/255, green: 41/255, blue: 59/255)              // #1e293b
    static let accentSlate = Color(red: 100/255, green: 116/255, blue: 139/255)      // #64748b
    static let textPrimary = Color.white
    static let textSecondary = Color(red: 148/255, green: 163/255, blue: 184/255)    // #94a3b8
}

// MARK: - Double formatting

extension Double {
    func formatted(decimals: Int = 0) -> String {
        String(format: "%.\(decimals)f", self)
    }
}

// MARK: - View extensions

extension View {
    func cardStyle() -> some View {
        self
            .padding()
            .background(Theme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
