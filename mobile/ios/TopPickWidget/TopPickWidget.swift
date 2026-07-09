import WidgetKit
import SwiftUI

/// Template WidgetKit extension — add as iOS Widget target in Xcode (I70).
struct TopPickEntry: TimelineEntry {
    let date: Date
    let title: String
    let subtitle: String
    let confidence: String
}

struct TopPickProvider: TimelineProvider {
    func placeholder(in context: Context) -> TopPickEntry {
        TopPickEntry(date: Date(), title: "Top pick", subtitle: "Loading…", confidence: "")
    }

    func getSnapshot(in context: Context, completion: @escaping (TopPickEntry) -> Void) {
        completion(placeholder(in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TopPickEntry>) -> Void) {
        let url = URL(string: "https://api.octobetiq.com/api/v1/feed/widget/top-pick")!
        URLSession.shared.dataTask(with: url) { data, _, _ in
            var entry = placeholder(in: context)
            if let data = data,
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let pick = json["pick"] as? [String: Any] {
                entry = TopPickEntry(
                    date: Date(),
                    title: (pick["headline"] as? String) ?? "Top pick",
                    subtitle: (pick["matchup"] as? String) ?? "",
                    confidence: (pick["confidence"] as? String) ?? ""
                )
            }
            let next = Calendar.current.date(byAdding: .minute, value: 45, to: Date()) ?? Date()
            completion(Timeline(entries: [entry], policy: .after(next)))
        }.resume()
    }
}

struct TopPickWidgetView: View {
    var entry: TopPickEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("octobetiQ").font(.caption2).foregroundStyle(.secondary)
            Text(entry.title).font(.headline).lineLimit(2)
            Text(entry.subtitle).font(.caption).lineLimit(1)
            if !entry.confidence.isEmpty {
                Text(entry.confidence).font(.caption2).foregroundStyle(.secondary)
            }
        }
        .padding()
    }
}

@main
struct TopPickWidget: Widget {
    let kind = "TopPickWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TopPickProvider()) { entry in
            TopPickWidgetView(entry: entry)
        }
        .configurationDisplayName("Today's Top Pick")
        .description("Informational AI pick — not betting advice.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
