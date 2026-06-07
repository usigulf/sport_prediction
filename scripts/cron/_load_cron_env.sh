# shellcheck shell=bash
# Safe env load for cron scripts (broken .env lines must not abort the job).
_read_cron_env_var() {
  local key="$1" file="$2"
  [[ -f "$file" ]] || return 0
  local val
  val="$( (grep -E "^${key}=" "$file" || true) | tail -1 | cut -d= -f2- | tr -d '\r' )"
  if [[ -n "$val" ]]; then
    export "${key}=${val}"
  fi
}

load_cron_env() {
  local root="${1:-.}"
  for file in "${root}/.env.production" "${root}/.env"; do
    _read_cron_env_var PUSH_CRON_SECRET "$file"
    _read_cron_env_var API_INTERNAL_URL "$file"
    _read_cron_env_var PREDICTION_INCLUDE_FINISHED_DAYS "$file"
    _read_cron_env_var PREDICTION_LEAGUES "$file"
    _read_cron_env_var MODEL_TRAIN_MIN_GAMES "$file"
    _read_cron_env_var MODEL_TRAIN_FORCE "$file"
    _read_cron_env_var MODEL_TRAIN_REFRESH_PREDICTIONS "$file"
  done
}
