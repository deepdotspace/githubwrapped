/**
 * Language aggregation + GitHub's canonical language colors.
 *
 * We sum byte counts (from `github/get-repository-languages`) across a bounded
 * set of the user's most-recently-pushed non-fork repos, then take the top 4 as
 * percentage slices. Colors are GitHub Linguist's canonical values where known,
 * with a neutral fallback otherwise.
 */

import type { WrappedLanguage } from '../../lib/wrapped/types'

/** GitHub Linguist canonical colors for the languages users actually hit. */
export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Go: '#00ADD8',
  Rust: '#dea584',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Scala: '#c22d40',
  'Objective-C': '#438eff',
  Shell: '#89e051',
  PowerShell: '#012456',
  Lua: '#000080',
  Perl: '#0298c3',
  Haskell: '#5e5086',
  Elixir: '#6e4a7e',
  Erlang: '#B83998',
  Clojure: '#db5855',
  HTML: '#e34c26',
  CSS: '#563d7c',
  SCSS: '#c6538c',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Astro: '#ff5a03',
  'Jupyter Notebook': '#DA5B0B',
  R: '#198CE7',
  MATLAB: '#e16737',
  Julia: '#a270ba',
  'Vim Script': '#199f4b',
  'Emacs Lisp': '#c065db',
  Assembly: '#6E4C13',
  Makefile: '#427819',
  CMake: '#DA3434',
  Dockerfile: '#384d54',
  Nix: '#7e7eff',
  Solidity: '#AA6746',
  Zig: '#ec915c',
  OCaml: '#3be133',
  'F#': '#b845fc',
  Crystal: '#000100',
  Nim: '#ffc200',
  Hack: '#878787',
  Roff: '#ecdebe',
  TeX: '#3D6117',
  SQL: '#e38c00',
  PLpgSQL: '#336790',
  Groovy: '#4298b8',
  CoffeeScript: '#244776',
  Batchfile: '#C1F12E',
  OpenSCAD: '#e5cd45',
  GLSL: '#5686a5',
  HLSL: '#aace60',
  Cython: '#fedf5b',
  Yacc: '#4B6C4B',
  Lex: '#DBCA00',
  SmPL: '#c94949',
  Gherkin: '#5B2063',
  Awk: '#a8d055',
  Markdown: '#083fa1',
}

const FALLBACK_COLOR = '#8b949e'

export function colorFor(language: string): string {
  return LANGUAGE_COLORS[language] ?? FALLBACK_COLOR
}

/**
 * Aggregate per-repo language byte maps into the top-4 slices. Pure: pass the
 * raw `{ Language: bytes }` objects, get back rounded percentage slices that sum
 * to ~100. Returns [] when there is nothing to count.
 */
export function aggregateLanguages(perRepo: Record<string, number>[]): WrappedLanguage[] {
  const totals = new Map<string, number>()
  for (const repo of perRepo) {
    for (const [lang, bytes] of Object.entries(repo)) {
      if (!Number.isFinite(bytes) || bytes <= 0) continue
      totals.set(lang, (totals.get(lang) ?? 0) + bytes)
    }
  }
  const grand = [...totals.values()].reduce((s, n) => s + n, 0)
  if (grand <= 0) return []

  // Largest-remainder rounding: integer percentages that sum to the rounded total
  // of the shown slices, so they never overshoot 100 and never need a 0->1 floor
  // (which used to print "100% JavaScript, and 1% TypeScript"). Slices that round
  // to 0% are dropped rather than floored.
  const top = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, bytes]) => ({ name, color: colorFor(name), exact: (bytes / grand) * 100 }))
  const target = Math.round(top.reduce((s, x) => s + x.exact, 0))
  const pct = top.map((x) => Math.floor(x.exact))
  let deficit = target - pct.reduce((s, p) => s + p, 0)
  top
    .map((x, i) => ({ i, frac: x.exact - Math.floor(x.exact) }))
    .sort((a, b) => b.frac - a.frac)
    .forEach(({ i }) => {
      if (deficit > 0) {
        pct[i]++
        deficit--
      }
    })

  return top.map((x, i) => ({ name: x.name, pct: pct[i], color: x.color })).filter((s) => s.pct >= 1)
}
