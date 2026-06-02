import { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { fetchIndianContent, fetchOTTContent, OTT_PLATFORMS } from '../app-example/constants/tmdb';
import { FilterPill } from '../app-example/components/ui';

function useWatchlist() {
  const [watched, setWatched] = useState([]);
  const [favs, setFavs] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const w = await AsyncStorage.getItem('watched');
        const f = await AsyncStorage.getItem('favs');
        if (w) setWatched(JSON.parse(w));
        if (f) setFavs(JSON.parse(f));
      } catch (e) {}
    })();
  }, []);
  const toggleWatched = async (id) => {
    const next = watched.includes(id) ? watched.filter(x => x !== id) : [...watched, id];
    setWatched(next);
    await AsyncStorage.setItem('watched', JSON.stringify(next));
  };
  const toggleFav = async (id) => {
    const next = favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id];
    setFavs(next);
    await AsyncStorage.setItem('favs', JSON.stringify(next));
  };
  return { watched, favs, toggleWatched, toggleFav };
}

const YEARS = ['Any Year', '2026', '2025', '2024', '2023', '2022'];
const MONTHS = ['May · Jun', 'Any Month', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LANGUAGES = ['All', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'English', 'Bengali', 'Marathi', 'Punjabi'];
const RATINGS = ['Any Rating', '9+', '8+', '7+', '6+'];
const GENRES = ['All Genres', 'Action', 'Comedy', 'Drama', 'Romance', 'Thriller', 'Horror', 'Sci-Fi', 'Crime', 'Family', 'Documentary'];

// TMDB genre IDs
const GENRE_IDS = {
  'Action': [28, 10759],
  'Comedy': [35],
  'Drama': [18],
  'Romance': [10749],
  'Thriller': [53],
  'Horror': [27],
  'Sci-Fi': [878],
  'Crime': [80],
  'Family': [10751],
  'Documentary': [99],
};

const now = new Date();
const CURRENT_MONTH = now.toLocaleString('en', { month: 'short' });
const CURRENT_YEAR = String(now.getFullYear());
const PREV_MONTH = new Date(now.getFullYear(), now.getMonth() - 1).toLocaleString('en', { month: 'short' });

export default function App() {
  const { watched, favs, toggleWatched, toggleFav } = useWatchlist();
  const [catalog, setCatalog] = useState([]);
  const [ottCatalog, setOttCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ottLoading, setOttLoading] = useState(false);
  const [tab, setTab] = useState('discover');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState(CURRENT_YEAR);
  const [monthFilter, setMonthFilter] = useState('May · Jun');
  const [langFilter, setLangFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('Any Rating');
  const [genreFilter, setGenreFilter] = useState('All Genres');
  const [selectedOTT, setSelectedOTT] = useState(OTT_PLATFORMS[0]);
  const router = useRouter();

  useEffect(() => {
    fetchIndianContent().then(data => { setCatalog(data); setLoading(false); });
  }, []);

  useEffect(() => {
    if (tab === 'ott') {
      setOttLoading(true);
      fetchOTTContent(selectedOTT.id).then(data => { setOttCatalog(data); setOttLoading(false); });
    }
  }, [tab, selectedOTT]);

  const sourceData = tab === 'ott' ? ottCatalog : catalog;

  const filtered = sourceData.filter(item => {
    if (tab === 'discover' && watched.includes(item.id)) return false;
    if (tab === 'favourites' && !favs.includes(item.id)) return false;
    if (tab === 'watched' && !watched.includes(item.id)) return false;
    if (tab === 'theatres') {
      if (!item.inTheatres) return false;
      if (item.type !== 'movie') return false;
    }
    if (tab !== 'theatres' && tab !== 'ott' && typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (langFilter !== 'All' && item.lang !== langFilter) return false;
    if (yearFilter !== 'Any Year' && String(item.year) !== yearFilter) return false;
    if ((monthFilter === 'Any Month' || monthFilter === 'May · Jun') && yearFilter === CURRENT_YEAR && tab === 'discover') {
      if (item.month && item.month !== CURRENT_MONTH && item.month !== PREV_MONTH) return false;
    }
    if (monthFilter !== 'Any Month' && monthFilter !== 'May · Jun' && item.month !== monthFilter) return false;

    // Rating filter
    if (ratingFilter !== 'Any Rating') {
      const minRating = parseFloat(ratingFilter.replace('+', ''));
      if (item.rating < minRating) return false;
    }

    // Genre filter
    if (genreFilter !== 'All Genres') {
      const ids = GENRE_IDS[genreFilter] || [];
      if (!item.genreIds || !ids.some(id => item.genreIds.includes(id))) return false;
    }

    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return MONTHS.indexOf(b.month || '') - MONTHS.indexOf(a.month || '');
  });

  const unwatched = catalog.filter(x => !watched.includes(x.id)).length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.logo}>🎪 Filmy Adda</Text>
            <Text style={styles.tagline}>INDIAN OTT · CINEMA · SHOWS</Text>
          </View>
          <View style={styles.badgeBox}>
            <Text style={styles.badgeNum}>{unwatched}</Text>
            <Text style={styles.badgeLabel}>TO WATCH</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {[['discover','🔥 Discover'],['ott','📱 OTT'],['theatres','🎭 Theatres'],['favourites','★ Favs'],['watched','✓ Watched']].map(([t, label]) => (
            <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {tab === 'ott' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            {OTT_PLATFORMS.map(p => (
              <TouchableOpacity key={p.id} onPress={() => setSelectedOTT(p)}
                style={[styles.ottPill, selectedOTT.id === p.id && { backgroundColor: p.color, borderColor: p.color }]}>
                <Text style={{ fontSize: 14 }}>{p.emoji}</Text>
                <Text style={[styles.ottPillText, selectedOTT.id === p.id && { color: '#fff' }]}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <TextInput value={search} onChangeText={setSearch} placeholder="🔍  Search..." placeholderTextColor="#444460" style={styles.searchInput} />

        {tab !== 'theatres' && tab !== 'ott' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
            {[['all','All'],['movie','🎬 Films'],['show','📺 Shows']].map(([v, label]) => (
              <FilterPill key={v} label={label} active={typeFilter === v} onPress={() => setTypeFilter(v)} />
            ))}
          </ScrollView>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
          {LANGUAGES.map(l => <FilterPill key={l} label={l} active={langFilter === l} onPress={() => setLangFilter(l)} />)}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
          {GENRES.map(g => <FilterPill key={g} label={g} active={genreFilter === g} onPress={() => setGenreFilter(g)} />)}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
          {RATINGS.map(r => <FilterPill key={r} label={r} active={ratingFilter === r} onPress={() => setRatingFilter(r)} />)}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
          {YEARS.map(y => <FilterPill key={y} label={y} active={yearFilter === y} onPress={() => setYearFilter(y)} />)}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {MONTHS.map(m => <FilterPill key={m} label={m} active={monthFilter === m} onPress={() => setMonthFilter(m)} />)}
        </ScrollView>
      </View>

      {(loading || ottLoading) ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color="#f7b731" />
          <Text style={{ color: '#888899', marginTop: 12 }}>{ottLoading ? `Loading ${selectedOTT.name}...` : 'Loading...'}</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🎬</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Nothing found</Text>
          <Text style={{ color: '#888899', fontSize: 12, marginTop: 6 }}>Try a different filter</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push({ pathname: '/detail', params: { id: String(item.id), type: item.type } })} activeOpacity={0.8}>
              <View style={[styles.card, watched.includes(item.id) && styles.cardWatched, favs.includes(item.id) && styles.cardFav]}>
                {item.inTheatres && (
                  <View style={[styles.badge2, { backgroundColor: '#8e44ad' }]}><Text style={styles.badgeText2}>🎭 CINEMA</Text></View>
                )}
                {!item.inTheatres && !watched.includes(item.id) && (
                  item.upcoming
                    ? <View style={[styles.badge2, { backgroundColor: '#27ae60' }]}><Text style={styles.badgeText2}>UPCOMING</Text></View>
                    : item.recent
                      ? <View style={styles.badge2}><Text style={styles.badgeText2}>NEW</Text></View>
                      : null
                )}
                <View style={styles.cardTop}>
                  {item.poster
                    ? <Image source={{ uri: item.poster }} style={styles.poster} />
                    : <Text style={{ fontSize: 40 }}>{item.emoji}</Text>
                  }
                  <View style={styles.cardInfo}>
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                      <Text style={styles.typeLabel}>{item.type === 'movie' ? '🎬 FILM' : '📺 SERIES'}</Text>
                      <Text style={styles.langLabel}>{item.lang}</Text>
                    </View>
                    <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                    <View style={{ flexDirection: 'row', gap: 2, marginBottom: 4 }}>
                      {[1,2,3,4,5].map(i => (
                        <Text key={i} style={{ color: i <= Math.round(item.rating/2) ? '#FFD700' : '#444460', fontSize: 11 }}>★</Text>
                      ))}
                      <Text style={{ color: '#888899', fontSize: 10, marginLeft: 4 }}>{item.rating}/10</Text>
                    </View>
                    <Text style={{ color: '#888899', fontSize: 10 }}>{item.year}{item.month ? ` · ${item.month}` : ''}</Text>
                  </View>
                </View>
                <Text style={styles.desc} numberOfLines={2}>{item.desc}</Text>
                <Text style={{ color: '#f7b73188', fontSize: 10, fontStyle: 'italic', marginBottom: 10 }}>Tap for details, cast & where to watch →</Text>
                <View style={styles.btnRow}>
                  <TouchableOpacity style={[styles.watchedBtn, watched.includes(item.id) && styles.watchedBtnDone]} onPress={() => toggleWatched(item.id)}>
                    <Text style={[styles.watchedBtnText, watched.includes(item.id) && { color: '#444460' }]}>
                      {watched.includes(item.id) ? '✓ Watched' : 'Mark Watched'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.favBtn, favs.includes(item.id) && styles.favBtnActive]} onPress={() => toggleFav(item.id)}>
                    <Text style={{ fontSize: 16, color: favs.includes(item.id) ? '#f7b731' : '#444460' }}>
                      {favs.includes(item.id) ? '★' : '☆'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0a18' },
  header: { backgroundColor: '#0f0c29', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#2a2a4a' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  logo: { fontSize: 22, fontWeight: '900', color: '#f7b731' },
  tagline: { fontSize: 9, color: '#444460', letterSpacing: 2, marginTop: 2 },
  badgeBox: { alignItems: 'flex-end' },
  badgeNum: { fontSize: 22, fontWeight: '900', color: '#f7b731' },
  badgeLabel: { fontSize: 8, color: '#888899', letterSpacing: 1 },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#1a1a3a', alignItems: 'center', marginRight: 6 },
  tabActive: { backgroundColor: '#f7b731' },
  tabText: { color: '#888899', fontSize: 10, fontWeight: '700' },
  tabTextActive: { color: '#000' },
  ottPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1.5, borderColor: '#2a2a4a', backgroundColor: '#1a1a3a', marginRight: 8 },
  ottPillText: { color: '#888899', fontSize: 11, fontWeight: '700' },
  searchInput: { backgroundColor: '#0a0a1a', borderWidth: 1, borderColor: '#2a2a4a', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: '#fff', fontSize: 13, marginBottom: 10 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  card: { backgroundColor: '#12122a', borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: '#2a2a4a', marginBottom: 12, position: 'relative' },
  cardWatched: { opacity: 0.45 },
  cardFav: { borderColor: '#f7b731' },
  cardTop: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  poster: { width: 70, height: 100, borderRadius: 8 },
  cardInfo: { flex: 1, justifyContent: 'center' },
  badge2: { position: 'absolute', top: 12, right: 12, backgroundColor: '#e74c3c', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeText2: { color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  typeLabel: { color: '#f7b731', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  langLabel: { color: '#888899', fontSize: 9, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 6, lineHeight: 20 },
  desc: { color: '#888899', fontSize: 11, lineHeight: 16, marginBottom: 6 },
  btnRow: { flexDirection: 'row', gap: 8 },
  watchedBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: '#11998e' },
  watchedBtnDone: { backgroundColor: '#222' },
  watchedBtnText: { color: '#000', fontWeight: '800', fontSize: 11 },
  favBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#2a2a4a', alignItems: 'center', justifyContent: 'center' },
  favBtnActive: { borderColor: '#f7b731', backgroundColor: '#f7b73115' },
});
