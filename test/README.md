# Pipecat Prebuilt test app

## Setup

1. Create your python venv:

```bash
python -m venv venv
source venv/bin/activate
```

2. Install requirements:

```bash
# install the prebuilt UI requirement
pip install -e ../
# install the other requirements
pip install -r requirements.txt
```

3. Create .env:

```
cp env.example .env
```

4. Add API keys for:

- Google

## Run the example

Now you can run the example:

```bash
python run.py
```

Open your browser to http://localhost:8000.
