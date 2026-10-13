import 'dart:convert';
import 'dart:io';
import 'package:dart_appwrite/dart_appwrite.dart';

// Scheduled monthly. Expands each FoodDistribution shell's activity recurrence
// (weekly weekday-set / monthly nth-weekday) into dated occurrences over a
// rolling window [today, +4 months] and rewrites each matched vendor's `events`,
// so CaliFood always shows upcoming distributions. No stored secret — uses the
// per-run dynamic key (function granted databases.read/write scopes).

const _databaseId = '656ed31b3edbb2e72cba';
const _activitiesColId = 'activities';
const _vendorsColId = 'vendors';
const _shellsColId = '69d0fa21000b836a1e81';
const _shellPrefix = 'FoodDistribution';

Future<dynamic> main(final context) async {
  final env = Platform.environment;
  String? pick(List<String> keys) { for (final k in keys) { final v = env[k]; if (v != null && v.isNotEmpty) return v; } return null; }

  final endpoint = pick(['APPWRITE_FUNCTION_ENDPOINT', 'APPWRITE_FUNCTION_API_ENDPOINT', 'ENDPOINT']);
  final project = pick(['APPWRITE_FUNCTION_PROJECT_ID', 'PROJECT_ID']);
  final headerKey = (context.req.headers['x-appwrite-key'] as String?)?.trim();
  final apiKey = (headerKey != null && headerKey.isNotEmpty) ? headerKey : pick(['APPWRITE_FUNCTION_API_KEY', 'API_KEY']);

  if (endpoint == null || project == null || apiKey == null || apiKey.isEmpty) {
    context.error('Missing endpoint/project/key');
    return context.res.json({'ok': false, 'error': 'missing config'}, statusCode: 500);
  }

  final client = Client().setEndpoint(endpoint).setProject(project).setKey(apiKey).setSelfSigned(status: false);
  final db = Databases(client);

  final now = DateTime.now().toUtc();
  final ws = DateTime.utc(now.year, now.month, now.day);
  final hz = DateTime.utc(now.year, now.month + 5, 0);
  String two(int n) => n.toString().padLeft(2, '0');
  String fmt(DateTime d) => '${d.year}-${two(d.month)}-${two(d.day)}';
  bool inWin(DateTime d) => !d.isBefore(ws) && !d.isAfter(hz);
  String hhmm(String? t) { if (t == null || t.isEmpty) return ''; final p = t.split(':'); return '${p[0].padLeft(2, '0')}:${(p.length > 1 ? p[1] : '0').padLeft(2, '0')}'; }
  String streetNo(String s) { final m = RegExp(r'^\s*(\d+)').firstMatch(s); return m != null ? m.group(1)! : ''; }
  String zipOf(String s) { final m = RegExp(r'\b\d{5}\b').allMatches(s).toList(); return m.isNotEmpty ? m.last.group(0)! : ''; }
  String norm(String s) => s.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), ' ').trim();

  DateTime? nthWeekday(int y, int m, int n, int dow) {
    if (n < 0) { final last = DateTime.utc(y, m + 1, 0); final off = (last.weekday - dow + 7) % 7; return DateTime.utc(y, m, last.day - off); }
    final first = DateTime.utc(y, m, 1); final off = (dow - first.weekday + 7) % 7; final day = 1 + off + (n - 1) * 7;
    final d = DateTime.utc(y, m, day); return d.month == m ? d : null;
  }

  List<Map<String, String>> expand(Map<String, dynamic> a) {
    final time = hhmm(a['startTime'] as String?);
    final title = (a['name'] as String?) ?? '';
    final r = a['recurrence'] as String?;
    final days = (a['recur_days'] as String?) ?? '';
    final dates = <String>[];
    if (r == 'weekly') {
      final set = days.split(',').where((s) => s.isNotEmpty).map(int.parse).toSet();
      for (var d = ws; !d.isAfter(hz); d = d.add(const Duration(days: 1))) { if (set.contains(d.weekday)) dates.add(fmt(d)); }
    } else if (r == 'monthly') {
      final pats = days.split(',').where((s) => s.isNotEmpty).map((p) { final s = p.split(':'); return [int.parse(s[0]), int.parse(s[1])]; }).toList();
      for (var k = 0; k < 6; k++) { final mo = DateTime.utc(ws.year, ws.month + k, 1); for (final p in pats) { final d = nthWeekday(mo.year, mo.month, p[0], p[1]); if (d != null && inWin(d)) dates.add(fmt(d)); } }
    } else { final ds = ((a['date'] as String?) ?? ''); if (ds.length >= 10) { final d = DateTime.tryParse(ds.substring(0, 10)); if (d != null && inWin(DateTime.utc(d.year, d.month, d.day))) dates.add(fmt(d)); } }
    return [for (final date in dates) {'date': date, 'time': time, 'title': title}];
  }

  Future<List<dynamic>> listAll(String col, String shell) async {
    final out = <dynamic>[]; String? cursor;
    while (true) {
      final q = [Query.equal('shellID', shell), Query.limit(100)];
      if (cursor != null) q.add(Query.cursorAfter(cursor));
      final res = await db.listDocuments(databaseId: _databaseId, collectionId: col, queries: q);
      out.addAll(res.documents);
      if (res.documents.length < 100) break;
      cursor = res.documents.last.$id;
    }
    return out;
  }

  // Discover every FoodDistribution shell dynamically so new counties are covered
  // automatically on each monthly run (same prefix CaliFood uses).
  final shellRes = await db.listDocuments(
    databaseId: _databaseId, collectionId: _shellsColId,
    queries: [Query.startsWith('name', _shellPrefix), Query.limit(200)]);
  final shells = [for (final d in shellRes.documents) d.$id];

  var totalV = 0, totalE = 0, totalFail = 0;
  final summary = <Map<String, dynamic>>[];
  for (final shell in shells) {
    final acts = await listAll(_activitiesColId, shell);
    final vends = await listAll(_vendorsColId, shell);
    final byKey = <String, dynamic>{}, byName = <String, dynamic>{};
    for (final v in vends) {
      final addr = (v.data['address'] as String?) ?? '';
      final k = '${streetNo(addr)}|${zipOf(addr)}';
      if (streetNo(addr).isNotEmpty && zipOf(addr).isNotEmpty) byKey[k] = v;
      byName[norm((v.data['name'] as String?) ?? '')] = v;
    }
    final evBy = <String, List<Map<String, String>>>{};
    for (final a in acts) {
      final addr = (a.data['locationText'] as String?) ?? '';
      final nm = norm(((a.data['name'] as String?) ?? '').replaceAll(RegExp(r' [—-] Free Food.*'), ''));
      final v = byKey['${streetNo(addr)}|${zipOf(addr)}'] ?? byName[nm];
      if (v == null) continue;
      (evBy[v.$id] ??= <Map<String, String>>[]).addAll(expand(Map<String, dynamic>.from(a.data)));
    }
    var upd = 0, ev = 0;
    for (final entry in evBy.entries) {
      final seen = <String>{}; final clean = <Map<String, String>>[];
      for (final e in entry.value) { final k = '${e['date']}|${e['time']}'; if (seen.add(k)) clean.add(e); }
      if (clean.isEmpty) continue;
      clean.sort((x, y) { final c = x['date']!.compareTo(y['date']!); return c != 0 ? c : x['time']!.compareTo(y['time']!); });
      ev += clean.length;
      try {
        await db.updateDocument(databaseId: _databaseId, collectionId: _vendorsColId, documentId: entry.key, data: {'events': jsonEncode(clean)});
        upd++;
      } catch (e) { totalFail++; }
    }
    totalV += upd; totalE += ev;
    summary.add({'shell': shell, 'vendors': upd, 'events': ev});
    context.log('shell $shell -> $upd vendors, $ev events');
  }
  final result = {'ok': true, 'window': '${fmt(ws)}..${fmt(hz)}', 'vendorsUpdated': totalV, 'events': totalE, 'failed': totalFail, 'summary': summary};
  context.log('DONE ${jsonEncode(result)}');
  return context.res.json(result);
}
