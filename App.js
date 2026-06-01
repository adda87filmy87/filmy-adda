import { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATALOG, GENRES, OTTS, COLORS, OTT_COLORS } from './constants/data';
import { ContentCard, FilterPill } from './components/ui';

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

export default function App() {
  const { watched, favs, toggleWatched, toggleFav } = useWatchlist();
  const [tab, setTab] = useState('discover');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [genreFilter, setGenreFilter] = useState('All');
  const [ottFilter, setOttFilter] = useState('All OTT');

  const filtered = CATALOG.filter(item => {
    if (tab === 'discover' && watched.includes(item.id)) return false;
    if (tab === 'favourites' && !favs.includes(item.id)) return false;
    if (tab === 'watched' && !watched.includes(item.id)) return false;
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (genreFilter !== 'All' && !item.genre.includes(genreFilter)) return false;
    if (ottFilter !== 'All OTT' && !item.ott.includes(ottFilter)) return false;
    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => b.rating - a.rating);

  const unwatched = CATALOG.filter(x => !watched.includes(x.id)).length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.logo}>🎪 Filmy Adda</Text>
            <Text style={styles.tagline}>INDIAN OTT · CINEMA · SHOWS</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeNum}>{unwatched}</Text>
            <Text style={styles.badgeLabel}>TO WATCH</Text>
          </View>
        </View>

        <View style={styles.tabs}>
          {[['discover','🔥 Discover'],['favourites','★ Favs'],['watched','✓ Watched']].map(([t, label]) => (
            <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput value={search} onChangeText={setSearch} placeholder="🔍  Search..." placeholderTextColor="#444460" style={styles.searchInput} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
          {[['all','All'],['movie','🎬 Films'],['show','📺 Shows']].map(([v, label]) => (
            <FilterPill key={v} label={label} active={typeFilter === v} onPress={() => setTypeFilter(v)} />
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
          {GENRES.map(g => <FilterPill key={g} label={g} active={genreFilter === g} onPress={() => setGenreFilter(g)} />)}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {OTTS.map(o => <FilterPill key={o} label={o} active={ottFilter === o} onPress={() => setOttFilter(o)} />)}
        </ScrollView>
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🎬</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Nothing here yet</Text>
          <Text style={{ color: '#888899', fontSize: 12, marginTop: 6, textAlign: 'center' }}>Try a different filter or tab</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <ContentCard item={item} watched={watched} fav={favs} onWatched={toggleWatched} onFav={toggleFav} />}
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
  badge: { alignItems: 'flex-end' },
  badgeNum: { fontSize: 22, fontWeight: '900', color: '#f7b731' },
  badgeLabel: { fontSize: 8, color: '#888899', letterSpacing: 1 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1a1a3a', alignItems: 'center' },
  tabActive: { backgroundColor: '#f7b731' },
  tabText: { color: '#888899', fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: '#000' },
  searchInput: { backgroundColor: '#0a0a1a', borderWidth: 1, borderColor: '#2a2a4a', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: '#fff', fontSize: 13, marginBottom: 10 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
});
