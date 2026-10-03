import os
import pandas as pd
from flask import Flask, jsonify, request, send_from_directory
from analytics import (
    VENUE_MAP,
    _compute_match_winners,
    get_all_seasons_api,
    get_suggestions_api,
    get_batter_analysis_api,
    get_bowler_analysis_api,
    get_team_analysis_api,
    get_season_analysis_api,
    get_venue_analysis_api,
    get_player_comparison_api
)

app = Flask(__name__, static_folder=".")

# Load dataset once when server starts
DATASET_PATH = None
for _p in ["IPL.csv.gz", "ipl.csv.gz", "IPL.csv", "ipl.csv"]:
    _full = os.path.join(os.path.dirname(__file__), _p)
    if os.path.exists(_full):
        DATASET_PATH = _full
        break

print(f"Loading IPL dataset from {DATASET_PATH}...")
df = pd.read_csv(DATASET_PATH, low_memory=False)
_match_map, _, _ = _compute_match_winners(df)
df["match_won_by"] = df["match_id"].map(_match_map).fillna(df["match_won_by"])
df["venue_clean"] = df["venue"].map(lambda v: VENUE_MAP.get(str(v), str(v)))
print("IPL Dataset loaded successfully!")


# Serve Static Frontend Files
@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/<path:filename>")
def serve_static(filename):
    return send_from_directory(".", filename)


# Live Seasons Endpoint
@app.route("/api/seasons", methods=["GET"])
def api_seasons():
    return jsonify(get_all_seasons_api())


# Live Autocomplete Suggestions Endpoint
@app.route("/api/suggest", methods=["GET"])
def api_suggest():
    query = request.args.get("q", "").strip()
    search_type = request.args.get("type", "batter").strip()
    if not query:
        return jsonify([])
    suggestions = get_suggestions_api(query, search_type=search_type)
    return jsonify(suggestions)


# REST API Endpoints
@app.route("/api/batter", methods=["GET"])
def api_batter():
    name = request.args.get("name", "").strip()
    exact = request.args.get("exact", "").strip() or None
    if not name and not exact:
        return jsonify({"error": "Player name parameter 'name' is required"}), 400
    res = get_batter_analysis_api(df, name, selected_exact=exact)
    return jsonify(res)


@app.route("/api/bowler", methods=["GET"])
def api_bowler():
    name = request.args.get("name", "").strip()
    exact = request.args.get("exact", "").strip() or None
    if not name and not exact:
        return jsonify({"error": "Bowler name parameter 'name' is required"}), 400
    res = get_bowler_analysis_api(df, name, selected_exact=exact)
    return jsonify(res)


@app.route("/api/team", methods=["GET"])
def api_team():
    team = request.args.get("team", "").strip()
    if not team:
        return jsonify({"error": "Team parameter 'team' is required"}), 400
    res = get_team_analysis_api(df, team)
    return jsonify(res)


@app.route("/api/season", methods=["GET"])
def api_season():
    year = request.args.get("year", "").strip()
    if not year:
        return jsonify({"error": "Season year parameter 'year' is required"}), 400
    res = get_season_analysis_api(df, year)
    return jsonify(res)


@app.route("/api/venue", methods=["GET"])
def api_venue():
    name = request.args.get("name", "").strip()
    if not name:
        return jsonify({"error": "Venue name parameter 'name' is required"}), 400
    res = get_venue_analysis_api(df, name)
    return jsonify(res)


@app.route("/api/compare", methods=["GET"])
def api_compare():
    p1 = request.args.get("p1", "").strip()
    p2 = request.args.get("p2", "").strip()
    if not p1 or not p2:
        return jsonify({"error": "Both 'p1' and 'p2' query parameters are required"}), 400
    res = get_player_comparison_api(df, p1, p2)
    return jsonify(res)


if __name__ == "__main__":
    print("Starting Flask Web Server on http://127.0.0.1:5000...")
    app.run(host="127.0.0.1", port=5000, debug=True)
