#!/usr/bin/env bash
set -euo pipefail

# Bootstrap directory structure for Banorte MCP Advanced stack
mkdir -p backend/app/{api,core,models,services}
mkdir -p frontend/src/{components,hooks,app}

cat <<'EOD' > backend/app/__init__.py
# Package marker for backend application
EOD

cat <<'EOD' > backend/app/api/__init__.py
# API package
EOD

cat <<'EOD' > backend/app/core/__init__.py
# Core configuration package
EOD

cat <<'EOD' > backend/app/models/__init__.py
# Models package
EOD

cat <<'EOD' > backend/app/services/__init__.py
# Services package
EOD

echo "Project skeleton created."
