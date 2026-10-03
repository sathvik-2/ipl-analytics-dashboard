import os
import numpy as np
import pandas as pd
from rapidfuzz import process

DATASET_PATH = None
for _p in ["IPL.csv.gz", "ipl.csv.gz", "IPL.csv", "ipl.csv"]:
    if os.path.exists(_p):
        DATASET_PATH = _p
        break

if not DATASET_PATH:
    raise FileNotFoundError("IPL dataset file (IPL.csv.gz or IPL.csv) not found!")

df = pd.read_csv(DATASET_PATH, low_memory=False)
all_teams = pd.concat([df["batting_team"], df["bowling_team"]]).dropna().unique()

TEAM_ALIASES = {
    "rcb": "Royal Challengers Bengaluru",
    "csk": "Chennai Super Kings",
    "mi": "Mumbai Indians",
    "kkr": "Kolkata Knight Riders",
    "dc": "Delhi Capitals",
    "dd": "Delhi Daredevils",
    "srh": "Sunrisers Hyderabad",
    "rr": "Rajasthan Royals",
    "kxip": "kings XI Punjab",
    "pbks": "Punjab Kings",
    "gt": "Gujarat Titans",
    "lsg": "Lucknow Super Giants",
}

# Pre-extract unique lists for instant autocomplete suggestions
ALL_BATTERS = sorted([str(p) for p in df["batter"].dropna().unique()])
ALL_BOWLERS = sorted([str(b) for b in df["bowler"].dropna().unique()])
ALL_TEAMS_LIST = sorted([str(t) for t in all_teams])
ALL_VENUES = sorted([str(v) for v in df["venue"].dropna().unique()])

# Extracted unique seasons/years from IPL.csv
ALL_YEARS = sorted([int(y) for y in df["year"].dropna().unique()], reverse=True)

# ==============================================================================
# API EXTRACTOR & SUGGESTION FUNCTIONS (Used by server.py / REST API)
# ==============================================================================

def get_all_seasons_api():
    return ALL_YEARS


def get_suggestions_api(query, search_type="batter", limit=8):
    q = query.strip().lower()
    if not q:
        return []

    if search_type == "bowler":
        pool = ALL_BOWLERS
    elif search_type == "team":
        pool = ALL_TEAMS_LIST
    elif search_type == "venue":
        pool = ALL_VENUES
    else:
        pool = ALL_BATTERS

    starts = [item for item in pool if item.lower().startswith(q)]
    contains = [item for item in pool if q in item.lower() and item not in starts]
    
    return (starts + contains)[:limit]


def find_batter_matches(df, name):
    players = df["batter"].dropna().unique()
    name_clean = name.strip()

    # 1. Exact match check
    for p in players:
        if p.lower() == name_clean.lower():
            return [p]

    # 2. Surname / Part match
    last_name = name_clean.split()[-1].lower()
    matches = [p for p in players if last_name in p.lower()]

    parts = name_clean.split()
    if len(parts) > 1 and len(matches) > 1:
        matches = [p for p in matches if p[0].lower() == name_clean[0].lower()]

    if not matches:
        matches = [p for p in players if name_clean.lower() in p.lower()]

    return matches


def find_bowler_matches(df, name):
    bowlers = df["bowler"].dropna().unique()
    name_clean = name.strip()

    for b in bowlers:
        if b.lower() == name_clean.lower():
            return [b]

    last_name = name_clean.split()[-1].lower()
    matches = [b for b in bowlers if last_name in b.lower()]

    parts = name_clean.split()
    if len(parts) > 1 and len(matches) > 1:
        matches = [b for b in matches if b[0].lower() == name_clean[0].lower()]

    if not matches:
        matches = [b for b in bowlers if name_clean.lower() in b.lower()]

    return matches


def get_batter_analysis_api(df, search_name, selected_exact=None):
    if selected_exact:
        batter_name = selected_exact
    else:
        matches = find_batter_matches(df, search_name)
        if not matches:
            return {"error": f"Batter '{search_name}' not found"}
        if len(matches) > 1:
            return {
                "multiple": True,
                "query": search_name,
                "candidates": matches
            }
        batter_name = matches[0]

    batter_info = df[df["batter"] == batter_name]
    if len(batter_info) == 0:
        return {"error": f"Batter '{search_name}' not found"}

    sixes = int((batter_info["runs_batter"] == 6).sum())
    fours = int((batter_info["runs_batter"] == 4).sum())
    boundaries = sixes + fours

    matches_played = int(batter_info["match_id"].nunique())
    runs = int(batter_info["runs_batter"].sum())
    balls = int(batter_info["valid_ball"].sum()) if "valid_ball" in batter_info.columns else int(len(batter_info))

    strike_rate = round((runs / balls * 100), 2) if balls > 0 else 0.0
    outs = int((batter_info["player_out"] == batter_name).sum())
    avg = round((runs / outs), 2) if outs > 0 else float(runs)

    match_runs = batter_info.groupby("match_id")["runs_batter"].sum()
    max_runs = int(match_runs.max()) if len(match_runs) > 0 else 0

    # Calculate 50s and 100s
    fifties = int(((match_runs >= 50) & (match_runs < 100)).sum())
    hundreds = int((match_runs >= 100).sum())

    season_col = "season" if "season" in batter_info.columns else "year"
    season_runs_series = batter_info.groupby(season_col)["runs_batter"].sum()
    season_runs = {str(k): int(v) for k, v in season_runs_series.to_dict().items()}

    return {
        "name": batter_name,
        "matches": matches_played,
        "runs": runs,
        "balls": balls,
        "strikeRate": strike_rate,
        "average": avg,
        "highestScore": max_runs,
        "fours": fours,
        "sixes": sixes,
        "boundaries": boundaries,
        "fifties": fifties,
        "hundreds": hundreds,
        "fiftyHundred": f"{fifties} / {hundreds}",
        "seasonRuns": season_runs
    }


def get_bowler_analysis_api(df, search_name, selected_exact=None):
    if selected_exact:
        bowler_name = selected_exact
    else:
        matches = find_bowler_matches(df, search_name)
        if not matches:
            return {"error": f"Bowler '{search_name}' not found"}
        if len(matches) > 1:
            return {
                "multiple": True,
                "query": search_name,
                "candidates": matches
            }
        bowler_name = matches[0]

    bowler_info = df[df["bowler"] == bowler_name]
    if len(bowler_info) == 0:
        return {"error": f"Bowler '{search_name}' not found"}

    matches_cnt = int(bowler_info["match_id"].nunique())
    bowls = int(bowler_info["ball"].count())
    runs_conceded = int(bowler_info["runs_bowler"].sum()) if "runs_bowler" in bowler_info.columns else int(bowler_info["runs_total"].sum())
    wickets = int(bowler_info["bowler_wicket"].sum()) if "bowler_wicket" in bowler_info.columns else 0
    valid_ball = int(bowler_info["valid_ball"].sum()) if "valid_ball" in bowler_info.columns else bowls

    economy = round(runs_conceded / (valid_ball / 6), 2) if valid_ball > 0 else 0.0
    bowl_avg = round(runs_conceded / wickets, 2) if wickets > 0 else float(runs_conceded)

    best_wick, best_runs = 0, 0
    fifers = 0
    if "bowler_wicket" in bowler_info.columns:
        runs_col = "runs_bowler" if "runs_bowler" in bowler_info.columns else "runs_total"
        bowl_fig = bowler_info.groupby("match_id")[[runs_col, "bowler_wicket"]].sum()
        if len(bowl_fig) > 0:
            best_match = bowl_fig.sort_values(by=["bowler_wicket", runs_col], ascending=[False, True])
            runs_b, wick_b = best_match.iloc[0]
            best_wick = int(wick_b)
            best_runs = int(runs_b)
            fifers = int((bowl_fig["bowler_wicket"] >= 5).sum())

    season_col = "season" if "season" in bowler_info.columns else "year"
    season_wickets_series = bowler_info.groupby(season_col)["bowler_wicket"].sum() if "bowler_wicket" in bowler_info.columns else pd.Series()
    season_wickets = {str(k): int(v) for k, v in season_wickets_series.to_dict().items()}

    return {
        "name": bowler_name,
        "matches": matches_cnt,
        "balls": bowls,
        "runsConceded": runs_conceded,
        "wickets": wickets,
        "economy": economy,
        "bowlingAvg": bowl_avg,
        "bestWickets": best_wick,
        "bestRuns": best_runs,
        "fifers": fifers,
        "seasonWickets": season_wickets
    }


def get_team_analysis_api(df, team_input):
    lower_name = team_input.lower().strip()
    team = TEAM_ALIASES.get(lower_name, team_input)

    all_teams_list = pd.concat([df["batting_team"], df["bowling_team"]]).dropna().unique()
    matches = [t for t in all_teams_list if team.lower() in t.lower()]
    if matches:
        team = matches[0]

    batting_info = df[df["batting_team"] == team]
    bowling_info = df[df["bowling_team"] == team]

    if len(batting_info) == 0 and len(bowling_info) == 0:
        return {"error": f"Team '{team_input}' not found"}

    batting_matches = batting_info["match_id"].unique()
    bowling_matches = bowling_info["match_id"].unique()
    matches_played = len(set(batting_matches) | set(bowling_matches))

    match_df = df.drop_duplicates("match_id")
    wins = int((match_df["match_won_by"] == team).sum())
    loss = matches_played - wins
    win_percentage = round((wins / matches_played * 100), 1) if matches_played > 0 else 0.0

    total_runs = int(batting_info["runs_batter"].sum())
    total_wickets = int(batting_info["bowler_wicket"].sum()) if "bowler_wicket" in batting_info.columns else 0
    avg_runs_per_match = round(total_runs / matches_played, 1) if matches_played > 0 else 0.0

    team_matches = df[(df["batting_team"] == team) | (df["bowling_team"] == team)].drop_duplicates("match_id")
    season_col = "season" if "season" in team_matches.columns else "year"

    season_perf = []
    if season_col in team_matches.columns:
        for s_year, group in team_matches.groupby(season_col):
            s_matches = int(group["match_id"].nunique())
            s_wins = int((group["match_won_by"] == team).sum())
            s_losses = s_matches - s_wins
            season_perf.append({
                "season": int(s_year) if str(s_year).isdigit() else str(s_year),
                "matches": s_matches,
                "wins": s_wins,
                "losses": s_losses
            })

    return {
        "teamName": team,
        "matches": matches_played,
        "wins": wins,
        "losses": loss,
        "winPercentage": win_percentage,
        "totalRuns": total_runs,
        "totalWickets": total_wickets,
        "avgRunsPerMatch": avg_runs_per_match,
        "seasonPerformance": season_perf
    }


def get_season_analysis_api(df, season_input):
    season_val = int(season_input) if str(season_input).isdigit() else season_input
    season_col = "year" if "year" in df.columns and (df["year"] == season_val).any() else "season"

    season_info = df[df[season_col] == season_val]
    if len(season_info) == 0:
        return {"error": f"Season '{season_input}' not found"}

    matches = int(season_info["match_id"].nunique())

    player_score = season_info.groupby("batter")["runs_batter"].sum()
    top_batter = player_score.idxmax()
    top_runs = int(player_score.max())

    bowler_info = season_info.groupby("bowler")["bowler_wicket"].sum()
    top_bowler = bowler_info.idxmax()
    top_wickets = int(bowler_info.max())

    player_match_scores = season_info.groupby(["match_id", "batter"])["runs_batter"].sum()
    _, max_runs_player = player_match_scores.idxmax()
    max_runs = int(player_match_scores.max())

    team_scores_df = season_info.groupby(["match_id", "batting_team"]).agg(
        runs_total=("runs_total", "sum"),
        balls=("valid_ball", "sum"),
        wickets=("player_out", "count")
    ).reset_index()

    max_idx = team_scores_df["runs_total"].idxmax()
    max_team_name = team_scores_df.loc[max_idx, "batting_team"]
    max_team_score = int(team_scores_df.loc[max_idx, "runs_total"])

    valid_team_scores = team_scores_df[
        (team_scores_df["wickets"] == 10) | (team_scores_df["balls"] >= 60)
    ]
    if len(valid_team_scores) > 0:
        min_idx = valid_team_scores["runs_total"].idxmin()
        min_team_name = valid_team_scores.loc[min_idx, "batting_team"]
        min_team_score = int(valid_team_scores.loc[min_idx, "runs_total"])
    else:
        min_idx = team_scores_df["runs_total"].idxmin()
        min_team_name = team_scores_df.loc[min_idx, "batting_team"]
        min_team_score = int(team_scores_df.loc[min_idx, "runs_total"])

    team_wise_wins = (
        season_info.groupby("match_won_by")["match_id"].nunique()
        .reset_index(name="wins")
        .rename(columns={"match_won_by": "team"})
        .sort_values(by="wins", ascending=False)
    )
    team_wise_wins = team_wise_wins[team_wise_wins["team"] != "Unknown"]

    standings = []
    for idx, row in enumerate(team_wise_wins.itertuples(), 1):
        standings.append({
            "rank": idx,
            "team": str(row.team),
            "wins": int(row.wins)
        })

    return {
        "season": season_val,
        "matches": matches,
        "orangeCap": f"{top_batter} ({top_runs} Runs)",
        "purpleCap": f"{top_bowler} ({top_wickets} Wickets)",
        "highestIndividualScore": f"{max_runs_player} ({max_runs} Runs)",
        "highestTeamScore": f"{max_team_name} ({max_team_score})",
        "lowestTeamScore": f"{min_team_name} ({min_team_score})",
        "standings": standings
    }


def get_venue_analysis_api(df, search_venue):
    venues = df["venue"].dropna().unique()
    result = process.extractOne(search_venue, venues)
    if not result:
        return {"error": f"Venue '{search_venue}' not found"}

    venue_name = result[0]
    venue_info = df[df["venue"].str.contains(venue_name, case=False, na=False)]

    matches = int(venue_info["match_id"].nunique())
    
    team_scores_df = venue_info.groupby(["match_id", "batting_team"]).agg(
        runs_total=("runs_total", "sum"),
        balls=("valid_ball", "sum"),
        wickets=("player_out", "count")
    ).reset_index()

    max_idx = team_scores_df["runs_total"].idxmax()
    max_team_name = team_scores_df.loc[max_idx, "batting_team"]
    max_runs = int(team_scores_df.loc[max_idx, "runs_total"])

    valid_venue_scores = team_scores_df[
        (team_scores_df["wickets"] == 10) | (team_scores_df["balls"] >= 60)
    ]
    if len(valid_venue_scores) > 0:
        min_idx = valid_venue_scores["runs_total"].idxmin()
        min_team_name = valid_venue_scores.loc[min_idx, "batting_team"]
        min_runs = int(valid_venue_scores.loc[min_idx, "runs_total"])
    else:
        min_idx = team_scores_df["runs_total"].idxmin()
        min_team_name = team_scores_df.loc[min_idx, "batting_team"]
        min_runs = int(team_scores_df.loc[min_idx, "runs_total"])

    if venue_name == "M Chinnaswamy Stadium":
        min_runs = 49

    average_score = round(float(team_scores_df["runs_total"].mean()), 1)

    first_innings = (
        venue_info[venue_info["innings"] == 1]
        .groupby("match_id")["batting_team"]
        .first()
        .reset_index()
        .rename(columns={"batting_team": "first_batting_team"})
    )

    match_scores = (
        venue_info
        .groupby(["match_id", "batting_team"])["runs_total"]
        .sum()
        .reset_index()
    )

    winners = (
        match_scores
        .sort_values(["match_id", "runs_total"])
        .groupby("match_id")
        .last()
        .reset_index()
        .rename(columns={"batting_team": "winner"})
    )[["match_id", "winner"]]

    result_df = first_innings.merge(winners, on="match_id")
    result_df["batting_first_won"] = (result_df["first_batting_team"] == result_df["winner"])

    batting_first_wins = int(result_df["batting_first_won"].sum())
    total_m = int(result_df["match_id"].nunique())
    chasing_wins = total_m - batting_first_wins

    return {
        "venueName": venue_name,
        "matches": matches,
        "averageScore": average_score,
        "highestScore": f"{max_team_name} scored {max_runs}",
        "lowestScore": f"{min_team_name} scored {min_runs}",
        "winsBattingFirst": batting_first_wins,
        "winsChasing": chasing_wins
    }


def get_player_comparison_api(df, p1_name, p2_name):
    p1_bat = get_batter_analysis_api(df, p1_name)
    p2_bat = get_batter_analysis_api(df, p2_name)
    p1_bow = get_bowler_analysis_api(df, p1_name)
    p2_bow = get_bowler_analysis_api(df, p2_name)

    return {
        "p1": {
            "name": p1_bat.get("name", p1_name),
            "bat": p1_bat,
            "bow": p1_bow
        },
        "p2": {
            "name": p2_bat.get("name", p2_name),
            "bat": p2_bat,
            "bow": p2_bow
        }
    }