module.exports = {
  git: {
    "commitMessage": "chore: release ${version}",
    "tagName": "v${version}",
    "requireCleanWorkingDir": false
  },
  npm: {
    "publish": true
  },
  github: {
    "release": true
  },
  plugins: {
    "@release-it/conventional-changelog": {
      "preset": "angular",
    }
  }
}
