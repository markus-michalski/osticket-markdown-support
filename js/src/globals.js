/**
 * Shared globals for all modules
 *
 * jQuery reference and debug flag, initialized once from the entry point.
 */

export let $ = null;
export let DEBUG = false;

export function init(jq, debug = false) {
    $ = jq;
    DEBUG = debug;
}
