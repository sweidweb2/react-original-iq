/** @param {string[]} files */
function relativeTo(app, files) {
  const prefix = `${app}/`
  return files
    .map((file) => file.replace(/\\/g, '/'))
    .filter((file) => file.startsWith(prefix))
    .map((file) => file.slice(prefix.length))
}

export default {
  '*.{js,jsx,ts,tsx,cjs,mjs,json,md,yml,yaml,css}': ['prettier --write'],
  'web-app/**/*.{ts,tsx}': (files) => {
    const paths = relativeTo('web-app', files)
    if (paths.length === 0) return []
    return [`npm exec --prefix web-app -- eslint --fix --max-warnings=0 ${paths.join(' ')}`]
  },
  'backend/**/*.{ts,js}': (files) => {
    const paths = relativeTo('backend', files).filter((p) => !p.startsWith('dist/'))
    if (paths.length === 0) return []
    return [`npm exec --prefix backend -- eslint --fix --max-warnings=0 ${paths.join(' ')}`]
  },
}
