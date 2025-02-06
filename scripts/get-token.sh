#!/bin/bash
echo "VITE_GOOGLE_ACCESS_TOKEN=$(gcloud auth print-access-token)" > .env.local