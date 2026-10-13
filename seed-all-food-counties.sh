#!/usr/bin/env bash
# Create + seed + publish the prepped county food-distribution shells.
# Run from the repo root:  bash seed-all-food-counties.sh
# To seed privately (review before going live), comment out the make-shell-public line.
set -u

COUNTIES=(Alameda Alpine Amador Butte Calaveras Colusa Fresno Glenn Humboldt Imperial Lassen Madera Marin Mariposa Mendocino Merced Modoc Mono Monterey Napa Nevada Placer Plumas Riverside SanBenito SanFrancisco SanJoaquin SanLuisObispo SanMateo SantaBarbara SantaClara SantaCruz Shasta Sierra Siskiyou Solano Sonoma Stanislaus Sutter Tehama Trinity Tulare Tuolumne Kern Ventura Yuba Kings Lake Inyo ContraCosta DelNorte ElDorado)

# Idempotent: existing FoodDistribution* shells are skipped so re-running only adds new counties.
EXISTING=$(node --env-file=.env list-food-shell-names.mjs 2>/dev/null)

seed_county() {
  local county="$1" name="FoodDistribution$1"
  local act="./${county}FoodDistribution.json" ven="./${county}FoodVendors.json"
  echo "######## $county ########"
  if echo "$EXISTING" | grep -qx "$name"; then echo "already exists, skipping"; return; fi
  if [ ! -f "$act" ] || [ ! -f "$ven" ]; then echo "!! missing $act or $ven, skipping"; return; fi
  local out id
  out=$(node --env-file=.env create-shell.mjs --name "$name" \
        --description "Free food distributions, pantries, and community meals across $county County, California.")
  echo "$out" | grep -E '\$id|Created|failed'
  id=$(echo "$out" | awk '/\$id:/{print $2}')
  if [ -z "$id" ]; then echo "!! no shell id for $county, skipping"; return; fi
  # seed-vendors targets the shell written in the file's _shellId, so patch it:
  node -e "const f='$ven',j=require(f);j._shellId='$id';require('fs').writeFileSync(f,JSON.stringify(j,null,2));console.log('patched _shellId -> $id')"
  node --env-file=.env seed-activities.mjs --file "$act" --no-host-grouping --shell-id "$id" 2>&1 | tail -3
  node --env-file=.env seed-vendors.mjs --file "$ven" 2>&1 | tail -3
  node --env-file=.env make-shell-public.mjs --shell-id "$id" 2>&1 | tail -2
  echo "== $county done: $id =="
  echo
}

for c in "${COUNTIES[@]}"; do seed_county "$c"; done
echo "All counties processed."
