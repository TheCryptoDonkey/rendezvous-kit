# Choosing a Fairness Strategy

rendezvous-kit scores candidate venues using a **fairness strategy** — a function that reduces each participant's travel time into a single score. Lower scores are better.

## The Three Strategies

### `min_max` — Nobody travels excessively (default)

Optimises for the **worst-case** travel time. The score is the longest individual journey.

**Best for:** Social meetups, events where one person travelling much further than everyone else feels unfair.

```
Alice: 30 min, Bob: 45 min, Carol: 20 min → score = 45
```

### `min_total` — Minimise group effort

Optimises for the **sum** of all travel times. The score is the total minutes spent travelling across the whole group.

**Best for:** Logistics, delivery hubs, or scenarios where total cost (fuel, time, emissions) matters more than individual fairness.

```
Alice: 30 min, Bob: 45 min, Carol: 20 min → score = 95
```

### `min_variance` — Everyone travels roughly equally

Optimises for **equalising** travel times. The score is the standard deviation of individual journey times.

**Best for:** Repeated meetings (e.g. weekly team syncs) where perceived fairness over time matters. Everyone should feel they are making a similar effort.

```
Alice: 30 min, Bob: 45 min, Carol: 20 min → score = 10.3
Alice: 35 min, Bob: 32 min, Carol: 33 min → score = 1.2 ← preferred
```

## When They Disagree

The three strategies often pick different top venues. Consider a scenario with two candidate cafés:

| Café | Alice | Bob | Carol | min_max | min_total | min_variance |
|------|-------|-----|-------|---------|-----------|--------------|
| The Fox | 25 min | 50 min | 25 min | 50 | 100 | 11.8 |
| The Bear | 35 min | 35 min | 35 min | 35 | 105 | 0.0 |

- **min_max** picks The Bear (worst case is 35 vs 50)
- **min_total** picks The Fox (total is 100 vs 105)
- **min_variance** picks The Bear (perfectly equal)

There is no universally "correct" strategy — choose based on what matters to your users.

## Usage

```typescript
const suggestions = await findRendezvous(engine, {
  participants: [alice, bob, carol],
  mode: 'drive',
  maxTimeMinutes: 60,
  venueTypes: ['cafe'],
  fairness: 'min_variance',  // or 'min_max' (default), 'min_total'
})
```

## Comparing Strategies

See [`examples/comparing-fairness-strategies.ts`](../examples/comparing-fairness-strategies.ts) for a runnable script that shows how the three strategies rank the same venues differently.
