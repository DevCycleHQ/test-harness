#!/bin/bash

# This script cherry-picks the SHA of the commit containing the local configuration setup into your current branch.
# It then soft resets it so that the changes are present but not comitted to your branch.

# check if working directory is clean
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working directory is not clean. Aborting."
  exit 1
fi

# fetch any remote changes
git fetch
# cherry pick the "magic commit" containing the configuration
git cherry-pick c9a2d0d45a376b0551b506a19067adfaa97b95ba
# reset softly to remove the commit from your branch history but keep the file changes
git reset HEAD~1

echo "Local configuration has been applied to your branch. Make sure not to commit the changes!"
