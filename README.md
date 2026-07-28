# DriftLens

Shows where a medical device has drifted from its reviewed design and surfaces the
evidence trail behind every changed component. Built for Agents You Love Hackathon 2.

DriftLens does not determine safety, compliance, or fault. It presents evidence
across Google Drive, Slack, Linear, and GitHub for a qualified human reviewer.

## Repository structure

```
driftlens/
├── frontend/                       Person 1
├── integrations/
│   ├── hydra-pipeshift/            Person 2
│   └── rocketride-insforge/        Person 3
├── integration/                    Person 4
├── shared/                         common contract, owned by everyone
├── README.md
└── .env.example
```

## Folder ownership

| Folder | Owner | Responsibility |
|---|---|---|
| `frontend/` | Person 1 | 3D model, component selection, status colors, evidence panel |
| `integrations/hydra-pipeshift/` | Person 2 | HydraDB retrieval and Pipeshift classification |
| `integrations/rocketride-insforge/` | Person 3 | RocketRide pipeline and InsForge intent/result storage |
| `integration/` | Person 4 | Connects all parts and prepares the working demo |
| `shared/` | Everyone | Common types and response contract (`ComponentResult`) that every folder reads or writes |

## Contract

Every folder speaks `ComponentResult`, defined in `shared/types.ts`. Person 2 produces
it, Person 3's RocketRide pipeline consumes and enriches it, Person 4 wires the
endpoint that returns it, and Person 1 renders it. See `shared/sample-response.json`
for a worked example.

## Getting started

1. Clone the repo and pull the latest `main`.
2. Copy `.env.example` to `.env` and fill in your own keys locally — never commit `.env`.
3. Work only inside your owned folder until `integration/` wires things together.
4. Read `shared/types.ts` before writing any output — it's the one contract everyone must match.
