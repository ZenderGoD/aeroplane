import MapKit
import UIKit

final class FlightAnnotationUIView: MKAnnotationView {
    private let iconSize: CGFloat = 24
    private let planeImageView = UIImageView()
    private let callsignLabel = UILabel()

    override init(annotation: MKAnnotation?, reuseIdentifier: String?) {
        super.init(annotation: annotation, reuseIdentifier: reuseIdentifier)
        setupView()
    }

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        setupView()
    }

    private func setupView() {
        frame = CGRect(x: 0, y: 0, width: 40, height: 40)
        centerOffset = CGPoint(x: 0, y: 0)
        canShowCallout = false
        backgroundColor = .clear

        // Plane icon
        let config = UIImage.SymbolConfiguration(pointSize: iconSize, weight: .medium)
        planeImageView.image = UIImage(systemName: "airplane", withConfiguration: config)
        planeImageView.tintColor = .white
        planeImageView.contentMode = .center
        planeImageView.frame = CGRect(x: 0, y: 0, width: 40, height: 40)
        addSubview(planeImageView)

        // Callsign label (shown at higher zoom levels)
        callsignLabel.font = UIFont.systemFont(ofSize: 8, weight: .semibold)
        callsignLabel.textColor = UIColor.white.withAlphaComponent(0.8)
        callsignLabel.textAlignment = .center
        callsignLabel.frame = CGRect(x: -10, y: 36, width: 60, height: 12)
        addSubview(callsignLabel)
    }

    func updateFlight(_ flight: Flight) {
        // Rotate by true track
        let rotation = (flight.trueTrack ?? 0) * .pi / 180.0
        planeImageView.transform = CGAffineTransform(rotationAngle: rotation)

        // Color by altitude (monochrome grayscale)
        let norm = flight.altitudeNormalized
        // Range from dark gray (0.3) to bright white (1.0)
        let brightness = 0.3 + norm * 0.7
        let color: UIColor
        if flight.onGround {
            color = UIColor(white: 0.35, alpha: 0.7)
        } else {
            color = UIColor(white: brightness, alpha: 1.0)
        }
        planeImageView.tintColor = color

        // Callsign label
        callsignLabel.text = flight.displayCallsign
    }
}
