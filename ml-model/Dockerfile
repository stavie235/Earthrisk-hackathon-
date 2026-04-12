FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app

# Run the full ML training pipeline:
#   1. data_loader.py   → generates data, uploads raw parquet to IBM COS
#   2. preprocess.py    → downloads from COS, cleans & normalizes, saves locally
#   3. model.py         → trains 7 models, uploads .pkl files to IBM COS
#   4. generate_trends.py → generates time-series trends, uploads to IBM COS
#
# Pass IBM COS credentials at runtime:
#   docker run --env-file .env earthrisk-ml
#
# To run interactively instead:
#   docker run --env-file .env -it earthrisk-ml bash
CMD ["bash", "-c", "python data_loader.py && python preprocess.py && python model.py && python generate_trends.py"]
