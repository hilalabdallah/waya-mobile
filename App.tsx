import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type ViewName = "home" | "circle" | "journal";
type Visibility = "private" | "circle" | "local";
type MediaKind = "photo" | "video";

type Trace = {
  id: string;
  author: string;
  handle: string;
  text: string;
  createdAt: string;
  visibility: Visibility;
  mood?: string;
  place?: string;
  mediaKind?: MediaKind;
  mediaUri?: string;
  isMine?: boolean;
  replies: number;
};

type SavedState = {
  traces: Trace[];
  viewedMedia: string[];
  lastActiveAt: string;
};

const storageKey = "waya-social-journal-v1";
const purple = "#8B5CF6";
const softPurple = "#F4EFFF";
const border = "#E8E5ED";
const black = "#090A0C";
const muted = "#8B8792";

const starterTraces: Trace[] = [
  {
    id: "seed-1",
    author: "As",
    handle: "@as",
    text: "Journee bizarre, j'sais meme pas s'il fait chaud ou froid...",
    createdAt: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
    visibility: "circle",
    mood: "flou",
    place: "Montceau",
    mediaKind: "photo",
    replies: 3,
  },
  {
    id: "seed-2",
    author: "Nolan",
    handle: "@nolan",
    text: "Ca craint, mais au moins c'est note quelque part.",
    createdAt: new Date(Date.now() - 1000 * 60 * 54).toISOString(),
    visibility: "circle",
    mood: "fatigue",
    replies: 1,
  },
  {
    id: "seed-3",
    author: "Zer",
    handle: "@zer",
    text: "Boulot de merde. J'avais juste besoin de poser la phrase.",
    createdAt: new Date(Date.now() - 1000 * 60 * 93).toISOString(),
    visibility: "local",
    place: "Le Creusot",
    replies: 0,
  },
  {
    id: "seed-4",
    author: "Maya",
    handle: "@maya",
    text: "Petit moment calme, ca faisait longtemps.",
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    visibility: "circle",
    mood: "pose",
    mediaKind: "video",
    replies: 6,
  },
];

function formatTraceTime(value: string) {
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(elapsed / 60000));

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} h`;
  }

  return `${Math.floor(hours / 24)} j`;
}

function visibilityLabel(visibility: Visibility) {
  if (visibility === "private") {
    return "Prive";
  }

  if (visibility === "local") {
    return "Public local";
  }

  return "Entourage";
}

function computePresence(traces: Trace[], lastActiveAt: string) {
  const mine = traces.filter((trace) => trace.isMine);
  const daysInactive = Math.floor((Date.now() - new Date(lastActiveAt).getTime()) / 86400000);
  const score = Math.max(8, Math.min(100, 42 + mine.length * 8 - daysInactive * 5));

  if (score >= 82) {
    return { score, label: "Ancre" };
  }
  if (score >= 64) {
    return { score, label: "Marquant" };
  }
  if (score >= 42) {
    return { score, label: "Present" };
  }
  if (score >= 24) {
    return { score, label: "Discret" };
  }

  return { score, label: "Silencieux" };
}

export default function App() {
  const [view, setView] = useState<ViewName>("home");
  const [traces, setTraces] = useState<Trace[]>(starterTraces);
  const [viewedMedia, setViewedMedia] = useState<string[]>([]);
  const [lastActiveAt, setLastActiveAt] = useState(new Date().toISOString());
  const [composerOpen, setComposerOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const presence = useMemo(() => computePresence(traces, lastActiveAt), [lastActiveAt, traces]);
  const sortedTraces = useMemo(
    () => [...traces].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [traces],
  );
  const myTraces = useMemo(() => sortedTraces.filter((trace) => trace.isMine), [sortedTraces]);

  useEffect(() => {
    async function loadState() {
      try {
        const saved = await AsyncStorage.getItem(storageKey);

        if (saved) {
          const parsed = JSON.parse(saved) as Partial<SavedState>;
          setTraces(Array.isArray(parsed.traces) && parsed.traces.length ? parsed.traces : starterTraces);
          setViewedMedia(Array.isArray(parsed.viewedMedia) ? parsed.viewedMedia : []);
          setLastActiveAt(typeof parsed.lastActiveAt === "string" ? parsed.lastActiveAt : new Date().toISOString());
        }
      } finally {
        setLoaded(true);
      }
    }

    loadState();
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    const state: SavedState = { traces, viewedMedia, lastActiveAt };
    AsyncStorage.setItem(storageKey, JSON.stringify(state));
  }, [lastActiveAt, loaded, traces, viewedMedia]);

  function addTrace(trace: Omit<Trace, "id" | "createdAt" | "author" | "handle" | "isMine" | "replies">) {
    const nextTrace: Trace = {
      ...trace,
      id: `trace-${Date.now()}`,
      author: "Ness",
      handle: "@ness",
      createdAt: new Date().toISOString(),
      isMine: true,
      replies: 0,
    };

    setTraces((current) => [nextTrace, ...current]);
    setLastActiveAt(new Date().toISOString());
    setComposerOpen(false);
  }

  function answerTrace(trace: Trace) {
    setLastActiveAt(new Date().toISOString());
    setTraces((current) =>
      current.map((item) => (item.id === trace.id ? { ...item, replies: item.replies + 1 } : item)),
    );
    Alert.alert("Reponse envoyee", `Tu viens de repondre a ${trace.author}.`);
  }

  function openMedia(trace: Trace) {
    if (!trace.mediaKind) {
      return;
    }

    if (viewedMedia.includes(trace.id) && !trace.isMine) {
      Alert.alert("Deja vu", "Ce moment ne pouvait etre ouvert qu'une seule fois.");
      return;
    }

    setViewedMedia((current) => (current.includes(trace.id) ? current : [...current, trace.id]));
    Alert.alert(
      trace.mediaKind === "video" ? "Video ouverte" : "Photo ouverte",
      trace.mediaUri
        ? "Dans cette V1, le media est attache a la trace. L'ouverture complete arrive dans l'etape suivante."
        : "Media fictif pour montrer le comportement visuel.",
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        <Header presence={presence} />

        {view === "home" && (
          <ScrollView contentContainerStyle={styles.screen}>
            <SectionHeader
              label="Accueil"
              text="Ce que ton entourage a depose recemment."
              title="Dernieres traces"
            />
            <View style={styles.traceList}>
              {sortedTraces.map((trace) => (
                <TraceCard
                  key={trace.id}
                  onAnswer={() => answerTrace(trace)}
                  onOpenMedia={() => openMedia(trace)}
                  trace={trace}
                  viewed={viewedMedia.includes(trace.id)}
                />
              ))}
            </View>
          </ScrollView>
        )}

        {view === "circle" && (
          <ScrollView contentContainerStyle={styles.screen}>
            <SectionHeader
              label="Entourage"
              text="Un cercle proche, pas une scene mondiale."
              title="Les gens qui comptent"
            />
            <View style={styles.peopleGrid}>
              {["As", "Nolan", "Zer", "Maya", "Yanis", "Lina"].map((name, index) => (
                <View key={name} style={styles.friendCard}>
                  <View style={styles.friendAvatar}>
                    <Text style={styles.friendInitial}>{name[0]}</Text>
                  </View>
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{name}</Text>
                    <Text style={styles.friendMeta}>
                      {index % 2 === 0 ? "A laisse une trace aujourd'hui" : "Silencieux depuis hier"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {view === "journal" && (
          <ScrollView contentContainerStyle={styles.screen}>
            <SectionHeader
              label="Journal"
              text="Tes traces privees et partagees, rangees comme une memoire."
              title="Ton carnet"
            />
            <View style={styles.journalHero}>
              <Text style={styles.journalNumber}>{myTraces.length}</Text>
              <Text style={styles.journalText}>
                {myTraces.length > 1 ? "traces laissees" : "trace laissee"} par toi
              </Text>
            </View>
            <View style={styles.traceList}>
              {(myTraces.length ? myTraces : sortedTraces.slice(0, 2)).map((trace) => (
                <TraceCard
                  compact
                  key={trace.id}
                  onAnswer={() => answerTrace(trace)}
                  onOpenMedia={() => openMedia(trace)}
                  trace={trace}
                  viewed={viewedMedia.includes(trace.id)}
                />
              ))}
            </View>
          </ScrollView>
        )}

        <Pressable
          onPress={() => setComposerOpen(true)}
          style={({ pressed }) => [styles.composeButton, pressed && styles.pressed]}
        >
          <Text style={styles.composePlus}>+</Text>
          <Text style={styles.composeText}>Trace</Text>
        </Pressable>

        <View style={styles.nav}>
          <Tab active={view === "circle"} label="Entourage" onPress={() => setView("circle")} />
          <Tab active={view === "home"} label="Accueil" onPress={() => setView("home")} />
          <Tab active={view === "journal"} label="Journal" onPress={() => setView("journal")} />
        </View>
      </View>

      <TraceComposer close={() => setComposerOpen(false)} onCreate={addTrace} visible={composerOpen} />
    </SafeAreaView>
  );
}

function Header({ presence }: { presence: { score: number; label: string } }) {
  return (
    <View style={styles.header}>
      <View style={styles.identityRow}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>N</Text>
          </View>
          <View>
            <Text style={styles.name}>Ness</Text>
            <Text style={styles.handle}>@ness</Text>
          </View>
        </View>
        <Text style={styles.logo}>WAYA</Text>
      </View>

      <View style={styles.presenceCard}>
        <View>
          <Text style={styles.presenceLabel}>Presence</Text>
          <Text style={styles.presenceTitle}>{presence.label}</Text>
        </View>
        <View style={styles.presenceMeter}>
          <View style={styles.presenceTrack}>
            <View style={[styles.presenceFill, { width: `${presence.score}%` }]} />
          </View>
          <Text style={styles.presenceHint}>Ta trace monte quand tu vis, ecris et reponds.</Text>
        </View>
      </View>
    </View>
  );
}

function SectionHeader({ label, text, title }: { label: string; text: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{text}</Text>
    </View>
  );
}

function TraceCard({
  compact,
  onAnswer,
  onOpenMedia,
  trace,
  viewed,
}: {
  compact?: boolean;
  onAnswer: () => void;
  onOpenMedia: () => void;
  trace: Trace;
  viewed: boolean;
}) {
  const hasMedia = Boolean(trace.mediaKind);

  return (
    <View
      style={[
        styles.traceCard,
        hasMedia && styles.traceCardMedia,
        hasMedia && viewed && styles.traceCardViewed,
        compact && styles.traceCardCompact,
      ]}
    >
      <View style={styles.traceTop}>
        <View style={styles.traceAuthorWrap}>
          <View style={[styles.traceAvatar, hasMedia && styles.traceAvatarMedia]}>
            <Text style={styles.traceAvatarText}>{trace.author[0]}</Text>
          </View>
          <View>
            <Text style={styles.traceAuthor}>{trace.author}</Text>
            <Text style={styles.traceMeta}>
              {trace.handle} · {formatTraceTime(trace.createdAt)} · {visibilityLabel(trace.visibility)}
            </Text>
          </View>
        </View>
        {hasMedia && (
          <Pressable onPress={onOpenMedia} style={[styles.mediaBadge, viewed && styles.mediaBadgeViewed]}>
            <Text style={[styles.mediaBadgeText, viewed && styles.mediaBadgeTextViewed]}>
              {trace.mediaKind === "video" ? "Video" : "Photo"}
            </Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.traceText}>{trace.text}</Text>

      {trace.mediaUri && trace.mediaKind === "photo" && trace.isMine && (
        <Image source={{ uri: trace.mediaUri }} style={styles.traceImage} />
      )}

      <View style={styles.traceFooter}>
        <Text style={styles.traceContext}>
          {[trace.mood, trace.place].filter(Boolean).join(" · ") || "trace simple"}
        </Text>
        <Pressable onPress={onAnswer} style={styles.replyButton}>
          <Text style={styles.replyText}>{trace.replies ? `${trace.replies} reponses` : "Repondre"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TraceComposer({
  close,
  onCreate,
  visible,
}: {
  close: () => void;
  onCreate: (trace: Omit<Trace, "id" | "createdAt" | "author" | "handle" | "isMine" | "replies">) => void;
  visible: boolean;
}) {
  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("circle");
  const [mediaKind, setMediaKind] = useState<MediaKind | undefined>();
  const [mediaUri, setMediaUri] = useState<string | undefined>();
  const [mood, setMood] = useState("");
  const [place, setPlace] = useState("");

  function reset() {
    setText("");
    setVisibility("circle");
    setMediaKind(undefined);
    setMediaUri(undefined);
    setMood("");
    setPlace("");
  }

  async function addMedia() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== "granted") {
      Alert.alert("Acces refuse", "Autorise les photos pour attacher un media a ta trace.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.75,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setMediaUri(asset?.uri);
      setMediaKind(asset?.type === "video" ? "video" : "photo");
    }
  }

  function submit() {
    const cleanText = text.trim();

    if (!cleanText && !mediaUri) {
      Alert.alert("Trace vide", "Pose une phrase ou ajoute un media avant de deposer ta trace.");
      return;
    }

    onCreate({
      text: cleanText || "Un moment depose sans phrase.",
      visibility,
      mood: mood.trim() || undefined,
      place: place.trim() || undefined,
      mediaKind,
      mediaUri,
    });
    reset();
  }

  function closeAndReset() {
    reset();
    close();
  }

  return (
    <Modal animationType="fade" onRequestClose={closeAndReset} transparent visible={visible}>
      <View style={styles.composerBackdrop}>
        <View style={styles.composerCard}>
          <View style={styles.composerTop}>
            <View>
              <Text style={styles.composerLabel}>Laisser une trace</Text>
              <Text style={styles.composerTitle}>Qu'est-ce que tu gardes d'aujourd'hui ?</Text>
            </View>
            <Pressable onPress={closeAndReset} style={styles.closeButton}>
              <Text style={styles.closeText}>x</Text>
            </Pressable>
          </View>

          <TextInput
            multiline
            onChangeText={setText}
            placeholder="Pose une phrase, meme courte..."
            placeholderTextColor="#AAA5B1"
            style={styles.input}
            value={text}
          />

          <View style={styles.inlineInputs}>
            <TextInput
              onChangeText={setMood}
              placeholder="humeur"
              placeholderTextColor="#AAA5B1"
              style={styles.miniInput}
              value={mood}
            />
            <TextInput
              onChangeText={setPlace}
              placeholder="lieu approx."
              placeholderTextColor="#AAA5B1"
              style={styles.miniInput}
              value={place}
            />
          </View>

          <View style={styles.visibilityRow}>
            <VisibilityPill active={visibility === "private"} label="Prive" onPress={() => setVisibility("private")} />
            <VisibilityPill active={visibility === "circle"} label="Entourage" onPress={() => setVisibility("circle")} />
            <VisibilityPill active={visibility === "local"} label="Public local" onPress={() => setVisibility("local")} />
          </View>

          <Pressable onPress={addMedia} style={[styles.mediaPicker, mediaKind && styles.mediaPickerActive]}>
            <Text style={styles.mediaPickerTitle}>{mediaKind ? `${mediaKind} attachee` : "Ajouter photo/video"}</Text>
            <Text style={styles.mediaPickerText}>Visible une seule fois par les autres.</Text>
          </Pressable>

          <Pressable onPress={submit} style={({ pressed }) => [styles.depositButton, pressed && styles.pressed]}>
            <Text style={styles.depositText}>Deposer la trace</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function VisibilityPill({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.visibilityPill, active && styles.visibilityPillActive]}>
      <Text style={[styles.visibilityText, active && styles.visibilityTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Tab({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  app: {
    backgroundColor: "#FAF9FC",
    flex: 1,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: black,
    borderRadius: 27,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900",
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "#F7F5FA",
    borderColor: border,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  closeText: {
    color: black,
    fontSize: 20,
    fontWeight: "900",
  },
  composeButton: {
    alignItems: "center",
    backgroundColor: purple,
    borderColor: "rgba(255,255,255,0.7)",
    borderRadius: 28,
    borderWidth: 4,
    bottom: 86,
    elevation: 10,
    height: 72,
    justifyContent: "center",
    left: "50%",
    marginLeft: -36,
    position: "absolute",
    shadowColor: purple,
    shadowOpacity: 0.3,
    shadowRadius: 18,
    width: 72,
  },
  composePlus: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 30,
  },
  composeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    marginTop: -2,
  },
  composerBackdrop: {
    backgroundColor: "rgba(9,10,12,0.24)",
    flex: 1,
    justifyContent: "flex-end",
  },
  composerCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    padding: 20,
    paddingBottom: 34,
  },
  composerLabel: {
    color: purple,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  composerTitle: {
    color: black,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 28,
    marginTop: 8,
    maxWidth: 270,
  },
  composerTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  depositButton: {
    alignItems: "center",
    backgroundColor: purple,
    borderRadius: 24,
    marginTop: 16,
    paddingVertical: 17,
  },
  depositText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  friendAvatar: {
    alignItems: "center",
    backgroundColor: black,
    borderRadius: 23,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  friendCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: border,
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
    shadowColor: "#17111F",
    shadowOpacity: 0.04,
    shadowRadius: 14,
  },
  friendInfo: {
    flex: 1,
  },
  friendInitial: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  friendMeta: {
    color: muted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  friendName: {
    color: black,
    fontSize: 18,
    fontWeight: "900",
  },
  handle: {
    color: muted,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  header: {
    backgroundColor: "#FAF9FC",
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  identity: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  identityRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  inlineInputs: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#FBFAFD",
    borderColor: border,
    borderRadius: 24,
    borderWidth: 1,
    color: black,
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 26,
    marginTop: 18,
    minHeight: 136,
    padding: 18,
    textAlignVertical: "top",
  },
  journalHero: {
    backgroundColor: black,
    borderRadius: 32,
    padding: 22,
  },
  journalNumber: {
    color: "#FFFFFF",
    fontSize: 62,
    fontWeight: "900",
    lineHeight: 66,
  },
  journalText: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
  },
  logo: {
    color: purple,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 1,
  },
  mediaBadge: {
    backgroundColor: softPurple,
    borderColor: "#D8C7FF",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  mediaBadgeText: {
    color: purple,
    fontSize: 11,
    fontWeight: "900",
  },
  mediaBadgeTextViewed: {
    color: "#AAA5B1",
  },
  mediaBadgeViewed: {
    backgroundColor: "#F5F3F7",
    borderColor: border,
  },
  mediaPicker: {
    backgroundColor: "#FBFAFD",
    borderColor: border,
    borderRadius: 22,
    borderStyle: "dashed",
    borderWidth: 1,
    marginTop: 12,
    padding: 15,
  },
  mediaPickerActive: {
    backgroundColor: softPurple,
    borderColor: "#D8C7FF",
  },
  mediaPickerText: {
    color: muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  mediaPickerTitle: {
    color: black,
    fontSize: 15,
    fontWeight: "900",
  },
  miniInput: {
    backgroundColor: "#FBFAFD",
    borderColor: border,
    borderRadius: 18,
    borderWidth: 1,
    color: black,
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  name: {
    color: black,
    fontSize: 19,
    fontWeight: "900",
  },
  nav: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderColor: "rgba(232,229,237,0.85)",
    borderRadius: 34,
    borderWidth: 1,
    bottom: 18,
    elevation: 8,
    flexDirection: "row",
    gap: 6,
    left: 18,
    padding: 8,
    position: "absolute",
    right: 18,
    shadowColor: "#17111F",
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  peopleGrid: {
    gap: 12,
  },
  presenceCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: border,
    borderRadius: 30,
    borderWidth: 1,
    flexDirection: "row",
    gap: 18,
    marginTop: 22,
    padding: 18,
    shadowColor: "#17111F",
    shadowOpacity: 0.04,
    shadowRadius: 18,
  },
  presenceFill: {
    backgroundColor: purple,
    borderRadius: 999,
    height: "100%",
  },
  presenceHint: {
    color: muted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 7,
  },
  presenceLabel: {
    color: muted,
    fontSize: 12,
    fontWeight: "900",
  },
  presenceMeter: {
    flex: 1,
  },
  presenceTitle: {
    color: black,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4,
  },
  presenceTrack: {
    backgroundColor: "#EFEDF2",
    borderRadius: 999,
    height: 9,
    overflow: "hidden",
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  replyButton: {
    backgroundColor: "#F7F5FA",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  replyText: {
    color: black,
    fontSize: 12,
    fontWeight: "900",
  },
  safe: {
    backgroundColor: "#FAF9FC",
    flex: 1,
  },
  screen: {
    gap: 16,
    padding: 18,
    paddingBottom: 178,
  },
  sectionHeader: {
    paddingTop: 10,
  },
  sectionLabel: {
    color: purple,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  sectionText: {
    color: muted,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: 6,
  },
  sectionTitle: {
    color: black,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 38,
    marginTop: 8,
  },
  tab: {
    alignItems: "center",
    borderRadius: 26,
    flex: 1,
    paddingVertical: 15,
  },
  tabActive: {
    backgroundColor: black,
  },
  tabText: {
    color: "#9A96A1",
    fontSize: 14,
    fontWeight: "900",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  traceAuthor: {
    color: black,
    fontSize: 16,
    fontWeight: "900",
  },
  traceAuthorWrap: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
  },
  traceAvatar: {
    alignItems: "center",
    backgroundColor: black,
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  traceAvatarMedia: {
    backgroundColor: purple,
  },
  traceAvatarText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  traceCard: {
    backgroundColor: "#FFFFFF",
    borderColor: border,
    borderRadius: 28,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#17111F",
    shadowOpacity: 0.045,
    shadowRadius: 16,
  },
  traceCardCompact: {
    padding: 14,
  },
  traceCardMedia: {
    borderColor: "#D8C7FF",
    shadowColor: purple,
    shadowOpacity: 0.08,
  },
  traceCardViewed: {
    borderColor: border,
    shadowColor: "#17111F",
    shadowOpacity: 0.035,
  },
  traceContext: {
    color: muted,
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  traceFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  traceImage: {
    borderRadius: 18,
    height: 160,
    marginTop: 14,
    width: "100%",
  },
  traceList: {
    gap: 12,
  },
  traceMeta: {
    color: muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  traceText: {
    color: "#2E2A33",
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 27,
    marginTop: 15,
  },
  traceTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  visibilityPill: {
    backgroundColor: "#FBFAFD",
    borderColor: border,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 11,
  },
  visibilityPillActive: {
    backgroundColor: black,
    borderColor: black,
  },
  visibilityRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  visibilityText: {
    color: muted,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  visibilityTextActive: {
    color: "#FFFFFF",
  },
});
