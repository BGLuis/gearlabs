#!/usr/bin/env bash
# Spike #91 (disposable, never merged): can the ATM11 catalogue be rebuilt from public sources only?
# Sources: GitHub API (AllTheMods/ATM-11, SilentChaos512/Silent-Gear), Modrinth API. No CurseForge call, no token.
# The local instance is only READ. Usage: spike/remote-sources.sh [q1|q2|q3|q4|q5|all]
set -uo pipefail

INST="${INST:-/home/jao/.local/share/PrismLauncher/instances/ATM 11}"
MC="$INST/minecraft"
ATM="AllTheMods/ATM-11"
SG="SilentChaos512/Silent-Gear"
SG_COMMIT="cb9926f4a3215a2f6016e4b465d1029ce06251e4"
SG_JAR="$MC/mods/silent-gear-26.1.2-neoforge-4.2.3.jar"
JARS=(silent-gear-26.1.2-neoforge-4.2.3.jar silentgems-26.1.2-neoforge-5.1.4.jar sgearmetalworks-26.1.2-1.6.0.jar allthemodium-26.1.2-4.2.0.jar)
UA="gearlabs-spike-91"
WALK="${WALK:-25}" # how many history commits to test per path
T="${TMPDIR:-/tmp}/spike91"
mkdir -p "$T"

norm() { sed '1s/^\xEF\xBB\xBF//' | jq -S .; }       # strip UTF-8 BOM, sort keys, re-indent
gh_raw() { gh api "repos/$1/contents/$2?ref=$3" -H 'Accept: application/vnd.github.raw'; }
modlist_at() { [ -s "$T/modlist.$1.json" ] || gh_raw "$ATM" config/crash_assistant/modlist.json "$1" | sed '1s/^\xEF\xBB\xBF//' >"$T/modlist.$1.json"; cat "$T/modlist.$1.json"; }
head_sha() { gh api "repos/$ATM/commits/main" --jq .sha; }
blob_hash() { git hash-object --stdin; }

# ---- Q1: do the 4 jars of modlist.json have the same name and SHA-1 as mods/*.jar? ----
# prints "<n>/4" and one line per jar; $1 = ATM-11 commit
q1_at() {
  local sha="$1" ok=0 jar loc rem
  for jar in "${JARS[@]}"; do
    loc=$(sha1sum "$MC/mods/$jar" 2>/dev/null | cut -d' ' -f1)
    rem=$(modlist_at "$sha" | jq -r --arg j "$jar" '.[$j].modrinthHash // "ABSENT"')
    if [ "$loc" = "$rem" ]; then ok=$((ok+1)); echo "  OK   $jar local=$loc modlist=$rem"
    else echo "  DIFF $jar local=${loc:-MISSING} modlist=$rem"; fi
  done
  echo "  matches: $ok/4"
}

# ---- Q2: kubegroovy/dynamic_data/**/silentgear_* of a commit vs the instance (diff -r on jq -S output) ----
# prints raw/normalised divergent counts; $1 = ATM-11 commit
q2_at() {
  local sha="$1" d="$T/q2.$1" f p n_loc n_rem raw=0 nrm=0
  rm -rf "$d"; mkdir -p "$d/local" "$d/remote"
  (cd "$MC" && find kubegroovy/dynamic_data -type f -path '*/silentgear_*/*' | sort) >"$d/local.list"
  gh api "repos/$ATM/git/trees/$sha?recursive=1" --jq '.tree[]|select(.type=="blob" and (.path|test("^kubegroovy/dynamic_data/.*/silentgear_[^/]*/")))|"\(.sha) \(.path)"' | sort -k2 >"$d/remote.tsv"
  cut -d' ' -f2- "$d/remote.tsv" >"$d/remote.list"
  n_loc=$(wc -l <"$d/local.list"); n_rem=$(wc -l <"$d/remote.list")
  while IFS= read -r p; do mkdir -p "$d/local/$(dirname "$p")"; norm <"$MC/$p" >"$d/local/$p"; done <"$d/local.list"
  while read -r bsha p; do
    [ -f "$MC/$p" ] && [ "$(blob_hash <"$MC/$p")" = "$bsha" ] && { mkdir -p "$d/remote/$(dirname "$p")"; cp "$d/local/$p" "$d/remote/$p"; continue; } # byte-identical
    raw=$((raw+1)); mkdir -p "$d/remote/$(dirname "$p")"; gh_raw "$ATM" "$p" "$sha" | norm >"$d/remote/$p"
  done <"$d/remote.tsv"
  nrm=$(diff -rq "$d/local" "$d/remote" | wc -l)
  echo "  files: local=$n_loc remote=$n_rem | byte-different or missing (raw): $((raw + $(comm -23 "$d/local.list" "$d/remote.list" | wc -l))) | different/missing after jq -S: $nrm"
  diff -rq "$d/local" "$d/remote" | sed 's/^/    /'
  return "$nrm"
}

# whole-instance fingerprint of a commit: how many modlist entries match mods/*.jar by name+SHA-1
fingerprint_at() {
  local sha="$1" same=0 diff=0 miss=0 jar h loc
  while IFS=$'\t' read -r jar h; do
    [ -f "$MC/mods/$jar" ] || { miss=$((miss+1)); continue; }
    loc=$(grep -F "  $jar" "$T/local.sha1" | head -1 | cut -d' ' -f1)
    [ "$loc" = "$h" ] && same=$((same+1)) || diff=$((diff+1))
  done < <(modlist_at "$sha" | jq -r 'to_entries[]|select(.value.modrinthHash)|[.key,.value.modrinthHash]|@tsv')
  echo "same=$same diff=$diff not-in-instance=$miss"
}

prep_local() { (cd "$MC/mods" && sha1sum -- *.jar) >"$T/local.sha1"; }

candidates() { # HEAD + commits touching modlist.json or kubegroovy/dynamic_data, newest first, unique
  { head_sha
    gh api "repos/$ATM/commits?path=config/crash_assistant/modlist.json&per_page=$WALK" --jq '.[].sha'
    gh api "repos/$ATM/commits?path=kubegroovy/dynamic_data&per_page=$WALK" --jq '.[].sha'
  } | awk '!s[$0]++'
}
commit_line() { gh api "repos/$ATM/commits/$1" --jq '"\(.sha[0:7]) \(.commit.committer.date) \(.commit.message|split("\n")[0])"'; }

run_q1q2() {
  prep_local
  local H; H=$(head_sha)
  echo "ATM-11 main HEAD used: $H  ($(commit_line "$H"))"
  echo "instance pack: $(jq -r '.name+" "+.version' "$INST/flame/manifest.json") (flame/manifest.json); ManagedPackVersionName=$(sed -n 's/^ManagedPackVersionName=//p' "$INST/instance.cfg")"
  echo; echo "== Q1/Q2 at main HEAD =="; echo "Q1:"; q1_at "$H"; echo "Q2:"; q2_at "$H"
  echo; echo "== history walk (HEAD + last $WALK commits touching modlist.json / kubegroovy/dynamic_data): which commit coincides? =="
  local c n1 n2 out
  while read -r c; do
    n1=$(q1_at "$c" | sed -n 's/.*matches: \([0-9]\)\/4/\1/p')
    q2_at "$c" >"$T/q2.out" 2>&1; n2=$(sed -n 's/.*after jq -S: \([0-9]*\).*/\1/p' "$T/q2.out" | head -1)
    echo "$(commit_line "$c") | Q1 jars matching: $n1/4 | Q2 divergent(norm): $n2 | modlist-vs-mods: $(fingerprint_at "$c")"
  done < <(candidates)
}

# ---- Q3: the 131 generated silentgear_materials of Silent-Gear@cb9926f vs the jar silent-gear-26.1.2-neoforge-4.2.3.jar ----
run_q3() {
  local d="$T/q3"; rm -rf "$d"; mkdir -p "$d/jar" "$d/gen"
  gh api "repos/$SG/git/trees/$SG_COMMIT?recursive=1" --jq '.tree[]|select(.type=="blob" and (.path|test("^src/generated/resources/data/silentgear/silentgear_materials/.*json$")))|"\(.sha) \(.path)"' | sort -k2 >"$d/gen.tsv"
  unzip -Z1 "$SG_JAR" | grep -E '^data/silentgear/silentgear_materials/.*json$' | sort >"$d/jar.list"
  local gp="src/generated/resources/" raw=0 bsha p rel
  echo "generated files @ cb9926f: $(wc -l <"$d/gen.tsv") | files in jar: $(wc -l <"$d/jar.list")"
  while read -r bsha p; do
    rel="${p#$gp}"; mkdir -p "$d/gen/$(dirname "$rel")"
    if unzip -p "$SG_JAR" "$rel" 2>/dev/null | blob_hash | grep -qx "$bsha"; then :; else raw=$((raw+1)); fi
    gh api "repos/$SG/git/blobs/$bsha" -H 'Accept: application/vnd.github.raw' | norm >"$d/gen/$rel"
  done <"$d/gen.tsv"
  while read -r rel; do mkdir -p "$d/jar/$(dirname "$rel")"; unzip -p "$SG_JAR" "$rel" | norm >"$d/jar/$rel"; done <"$d/jar.list"
  echo "byte-different or missing (raw): $((raw + $(comm -13 <(cut -d' ' -f2- "$d/gen.tsv" | sed "s|^$gp||") "$d/jar.list" | wc -l)))"
  echo "divergent after jq -S (different + only-in-one-side): $(diff -rq "$d/gen" "$d/jar" | wc -l)"
  diff -rq "$d/gen" "$d/jar" | sed 's/^/  /'
}

# ---- Q4: Modrinth GET /version_file/{sha1}, no token ----
run_q4() {
  prep_local
  local jar loc rem code ok=0 body
  for jar in "${JARS[@]}"; do
    loc=$(grep -F "  $jar" "$T/local.sha1" | cut -d' ' -f1)
    rem=$(modlist_at "$(head_sha)" | jq -r --arg j "$jar" '.[$j].modrinthHash // "ABSENT"')
    for h in $(printf '%s\n' "$loc" "$rem" | sort -u); do
      echo "GET https://api.modrinth.com/v2/version_file/$h   # $jar ($([ "$h" = "$loc" ] && echo local-sha1) $([ "$h" = "$rem" ] && echo modlist-hash))"
      body=$(curl -s -m 30 -A "$UA" -w '\n%{http_code}' "https://api.modrinth.com/v2/version_file/$h")
      code=${body##*$'\n'}; body=${body%$'\n'*}
      if [ "$code" = 200 ]; then echo "  -> 200 $(echo "$body" | jq -r '"version_number=\(.version_number) project_id=\(.project_id)"')"; echo "$body" | jq -r --arg h "$h" '.files[]|select(.hashes.sha1==$h)|"     url=\(.url)"'
      else echo "  -> HTTP $code"; fi
      [ "$code" = 200 ] && [ "$h" = "$loc" ] && ok=$((ok+1))
      sleep 0.5
    done
  done
  echo "jars resolved by the LOCAL sha1 (the file actually installed): $ok/4"
}


# ---- Q4b: the Modrinth silent-gear jar (hash from modlist.json) vs the installed jar: same content? ----
run_q4b() {
  local url="https://cdn.modrinth.com/data/73mSSnCf/versions/eG4f2c3T/silent-gear-26.1.2-neoforge-4.2.3.jar" d="$T/q4b"
  mkdir -p "$d"; curl -s -m 120 -A "$UA" -o "$d/remote.jar" "$url"
  echo "remote sha1: $(sha1sum "$d/remote.jar" | cut -d' ' -f1) | local sha1: $(sha1sum "$SG_JAR" | cut -d' ' -f1)"
  echo "size remote/local: $(stat -c %s "$d/remote.jar")/$(stat -c %s "$SG_JAR")"
  local en; en=$(diff <(unzip -Z1 "$d/remote.jar" | sort) <(unzip -Z1 "$SG_JAR" | sort) | grep -c '^[<>]'); echo "entry names different (present on one side only): $en"
  rm -rf "$d/r" "$d/l"; mkdir -p "$d/r" "$d/l"; (cd "$d/r" && unzip -qo ../remote.jar); (cd "$d/l" && unzip -qo "$SG_JAR")
  local j=0 c=0 f
  while read -r f; do cmp -s <(jq -S . "$d/r/$f" 2>/dev/null) <(jq -S . "$d/l/$f" 2>/dev/null) || { j=$((j+1)); echo "  json differs after jq -S: $f"; }; done < <(cd "$d/r" && find . -name '*.json' -not -path './META-INF/*' | sort)
  echo "json files different after jq -S: $j"
  echo "silentgear_materials raw diff: $(diff -rq "$d/r/data/silentgear/silentgear_materials" "$d/l/data/silentgear/silentgear_materials" | wc -l) files"
  c=$(diff -rq "$d/r" "$d/l" | grep -c '\.class'); echo ".class files different: $c (other build of the same version; CRLF vs LF in the JSON)"
}

# ---- Q5: release -> commit link ----
run_q5() {
  local H; H=$(head_sha)
  echo "tags: $(gh api "repos/$ATM/tags" --jq length) | releases: $(gh api "repos/$ATM/releases" --jq length)"
  echo "files in the main tree whose path mentions version/manifest/pack.toml:"
  gh api "repos/$ATM/git/trees/$H?recursive=1" --jq '.tree[]|select(.path|test("(^|/)(version|manifest|pack\\.toml)";"i"))|"  "+.path'
  echo "commits whose first line names a pack version (e.g. 0.14.0-beta):"
  gh api "repos/$ATM/commits?per_page=100" --paginate --jq '.[]|select(.commit.message|split("\n")[0]|test("[0-9]+\\.[0-9]+\\.[0-9]+";""))|"  \(.sha[0:7]) \(.commit.committer.date) \(.commit.message|split("\n")[0])"' | head -20
  echo "dates available offline for the installed pack: flame/manifest.json has no date field (keys: $(jq -r 'keys|join(",")' "$INST/flame/manifest.json")); file mtime = $(stat -c %y "$INST/flame/manifest.json") (install time, not release time)"
  echo "ManagedPackVersionID (CurseForge file id, date needs the CurseForge API = token): $(sed -n 's/^ManagedPackVersionID=//p' "$INST/instance.cfg")"
  echo "example query once a release date <D> is known: gh api \"repos/$ATM/commits?until=<D>&per_page=1\" --jq '.[0].sha'"
}

case "${1:-all}" in
  q1|q2) run_q1q2 ;;
  q3) run_q3 ;;
  q4) run_q4; echo; echo '== Q4b =='; run_q4b ;;
  q5) run_q5 ;;
  all) run_q1q2; echo; echo "== Q3 =="; run_q3; echo; echo "== Q4 =="; run_q4; echo; echo "== Q5 =="; run_q5 ;;
esac
