import { useState, useCallback, useEffect } from "react";
import "./App.css";
import factionsData from "./factions.json";

// ── Types ─────────────────────────────────────────────────────────────────────
interface FactionData {
    first_names?: string[];
    last_names?: string[];
}

interface DataStore {
    [faction: string]: FactionData;
}

type NameType = "full" | "first" | "last";
type SortType = "random" | "alpha";

interface GeneratedName {
    id: number;
    name: string;
    faction: string;
}

const FACTIONS_DATA: DataStore = factionsData as DataStore;

// ── Utils ─────────────────────────────────────────────────────────────────────
let _idCounter = 0;
function uid() { return ++_idCounter; }

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateName(data: DataStore, faction: string, type: NameType): string {
    const d = data[faction];
    if (!d) return "—";
    const hasFirst = d.first_names && d.first_names.length > 0;
    const hasLast  = d.last_names  && d.last_names.length  > 0;
    if (type === "first") return hasFirst ? pick(d.first_names!) : "—";
    if (type === "last")  return hasLast  ? pick(d.last_names!)  : "—";
    const first = hasFirst ? pick(d.first_names!) : "";
    const last  = hasLast  ? pick(d.last_names!)  : "";
    return [first, last].filter(Boolean).join(" ") || "—";
}

function parseJSON(raw: string): DataStore {
    const parsed = JSON.parse(raw.trim()) as Record<string, unknown>;
    for (const key of Object.keys(parsed)) {
        const val = parsed[key] as Record<string, unknown>;
        if (
            typeof val !== "object" ||
            (!Array.isArray(val.first_names) && !Array.isArray(val.last_names))
        ) {
            throw new Error(`"${key}" must have first_names or last_names arrays`);
        }
    }
    return parsed as DataStore;
}

// ── NameRow component ─────────────────────────────────────────────────────────
function NameRow({ item, index }: { item: GeneratedName; index: number }) {
    const [copied, setCopied] = useState(false);

    const handleClick = useCallback(async () => {
        try { await navigator.clipboard.writeText(item.name); } catch { /* noop */ }
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }, [item.name]);

    return (
        <li
            onClick={handleClick}
            style={{ animationDelay: `${index * 28}ms` }}
            className={`name-row${copied ? " copied" : ""}`}
        >
            <span className="name-text">{item.name}</span>
            <span className="meta">{item.faction}</span>
            <span className="copy-hint">{copied ? "COPIED ✓" : "COPY ↗"}</span>
        </li>
    );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function NameGenerator() {
    const [data, setData]           = useState<DataStore>(FACTIONS_DATA);
    const [faction, setFaction]     = useState<string>(Object.keys(FACTIONS_DATA)[0]);
    const [nameType, setNameType]   = useState<NameType>("full");
    const [count, setCount]         = useState<number>(10);
    const [sort, setSort]           = useState<SortType>("random");
    const [names, setNames]         = useState<GeneratedName[]>([]);
    const [generated, setGenerated] = useState(false);
    const [jsonText, setJsonText]   = useState("");
    const [jsonMsg, setJsonMsg]     = useState<{ text: string; ok: boolean } | null>(null);

    const factions = Object.keys(data);

    const handleGenerate = useCallback(() => {
        const clampedCount = Math.min(Math.max(count || 10, 1), 100);
        const generated: GeneratedName[] = Array.from({ length: clampedCount }, () => ({
            id: uid(),
            name: generateName(data, faction, nameType),
            faction,
        }));
        if (sort === "alpha") generated.sort((a, b) => a.name.localeCompare(b.name));
        setNames(generated);
        setGenerated(true);
    }, [data, faction, nameType, count, sort]);

    const handleClear = useCallback(() => {
        setNames([]);
        setGenerated(false);
    }, []);

    const handleLoadJSON = useCallback(() => {
        setJsonMsg(null);
        try {
            const parsed = parseJSON(jsonText);
            setData(parsed);
            setFaction(Object.keys(parsed)[0] ?? "");
            setJsonMsg({ text: `✓ Loaded ${Object.keys(parsed).length} faction(s)`, ok: true });
            setTimeout(() => setJsonMsg(null), 3000);
        } catch (e) {
            setJsonMsg({ text: `✗ ${(e as Error).message}`, ok: false });
        }
    }, [jsonText]);

    const handleReset = useCallback(() => {
        setData(FACTIONS_DATA);
        setFaction(Object.keys(FACTIONS_DATA)[0]);
        setJsonText("");
        setJsonMsg(null);
        setNames([]);
        setGenerated(false);
    }, []);

    // Ctrl/Cmd+Enter to generate
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleGenerate();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [handleGenerate]);

    return (
        <div className="container">
            <header>
                <div className="label">// Personnel Database</div>
                <h1>Name Generator</h1>
                <p>Click a name to copy &nbsp;·&nbsp; Generate new batches with the controls below</p>
            </header>

            {/* Faction selector */}
            <div className="faction-row">
                <label>FACTION //</label>
                <select
                    value={faction}
                    onChange={e => setFaction(e.target.value)}
                    className="styled-select"
                >
                    {factions.map(f => (
                        <option key={f} value={f}>{f}</option>
                    ))}
                </select>
            </div>

            {/* Controls */}
            <div className="controls">
                <div className="ctrl-group">
                    <label>Name Type</label>
                    <select
                        className="styled-select"
                        value={nameType}
                        onChange={e => setNameType(e.target.value as NameType)}
                    >
                        <option value="full">Full Name</option>
                        <option value="first">First Only</option>
                        <option value="last">Last Only</option>
                    </select>
                </div>
                <div className="ctrl-group">
                    <label>Count</label>
                    <input
                        type="number"
                        value={count}
                        min={1}
                        max={100}
                        onChange={e => setCount(parseInt(e.target.value) || 10)}
                    />
                </div>
                <div className="ctrl-group">
                    <label>Sort</label>
                    <select
                        className="styled-select"
                        value={sort}
                        onChange={e => setSort(e.target.value as SortType)}
                    >
                        <option value="random">Random</option>
                        <option value="alpha">Alphabetical</option>
                    </select>
                </div>
                <button className="generate-btn" onClick={handleGenerate}>GENERATE</button>
            </div>

            {/* Output */}
            <div className="output-header">
                <span>// OUTPUT {names.length > 0 && `(${names.length})`}</span>
                <button className="clear-btn" onClick={handleClear}>CLEAR</button>
            </div>
            <ul className="name-list">
                {!generated ? (
                    <li className="empty-row"><div className="empty-state">[ AWAITING GENERATION ]</div></li>
                ) : names.length === 0 ? (
                    <li className="empty-row"><div className="empty-state">[ NO RESULTS ]</div></li>
                ) : (
                    names.map((item, i) => <NameRow key={item.id} item={item} index={i} />)
                )}
            </ul>

            {/* JSON Loader */}
            <div className="json-section">
                <div className="json-section-header">// Load Custom JSON Data</div>
                <textarea
                    className="json-input"
                    value={jsonText}
                    onChange={e => setJsonText(e.target.value)}
                    placeholder={`Paste your JSON here, e.g.:\n{\n  "Capellan Confederation": {\n    "first_names": ["Daoshen", "Sun-Tzu"],\n    "last_names": ["Liao", "Centrella"]\n  }\n}`}
                />
                <div className="json-actions">
                    <button className="sec-btn" onClick={handleLoadJSON}>Load JSON</button>
                    <button className="sec-btn" onClick={handleReset}>Reset to Factions Data</button>
                </div>
                {jsonMsg && (
                    <div className="json-msg" style={{ color: jsonMsg.ok ? "#4a7fa5" : "#c05050" }}>
                        {jsonMsg.text}
                    </div>
                )}
            </div>
        </div>
    );
}