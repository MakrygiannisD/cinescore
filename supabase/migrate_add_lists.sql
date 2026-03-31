-- ═══════════════════════════════════════════════════════
--  CineScore — Add new category lists
--  Run this in the Supabase SQL Editor ONCE.
-- ═══════════════════════════════════════════════════════

INSERT INTO public.lists (slug, name, description, emoji) VALUES
  -- Decades
  ('50s-classics',   '50s Classics',       'Golden age Hollywood from the 1950s',         '🎞️'),
  ('60s-classics',   '60s Classics',       'Iconic cinema from the swinging sixties',      '🕺'),
  ('70s-classics',   '70s Classics',       'New Hollywood and beyond',                     '🪩'),
  ('80s-classics',   '80s Classics',       'The decade that defined blockbusters',         '🕹️'),
  ('2000s-hits',     '2000s Hits',         'The best films from 2000–2009',                '💿'),
  ('2010s-hits',     '2010s Hits',         'Defining films of the 2010s',                  '📱'),
  ('2020s-hits',     '2020s Hits',         'The best of recent cinema',                    '🎬'),
  -- Genres
  ('action',         'Action',             'High-octane thrills and stunts',               '💥'),
  ('comedy',         'Comedy',             'Films guaranteed to make you laugh',           '😂'),
  ('drama',          'Drama',              'Powerful stories about the human condition',   '🎭'),
  ('thriller',       'Thriller',           'Edge-of-your-seat suspense',                   '😰'),
  ('crime',          'Crime',              'Heists, detectives and the criminal world',    '🔫'),
  ('animation',      'Animation',          'The best animated films ever made',            '✏️'),
  ('romance',        'Romance',            'Love stories that stand the test of time',     '❤️'),
  ('war',            'War',                'The harsh reality of conflict on screen',      '🎖️'),
  ('western',        'Western',            'Cowboys, outlaws and the Wild West',           '🤠'),
  ('mystery',        'Mystery',            'Whodunits and puzzles that keep you guessing', '🔍'),
  ('documentary',    'Documentary',        'Truth is stranger than fiction',               '📽️'),
  ('biography',      'Biography',          'Real lives, remarkable stories',               '📖'),
  ('musical',        'Musical',            'Song, dance and spectacle',                    '🎵'),
  ('fantasy',        'Fantasy',            'Worlds beyond imagination',                    '🧙'),
  ('adventure',      'Adventure',          'Epic journeys to the ends of the earth',       '🗺️'),
  ('family',         'Family',             'Films for all ages',                           '👨‍👩‍👧‍👦'),
  ('sport',          'Sport',              'The drama of competition',                     '🏆'),
  -- Special
  ('foreign-language','Foreign Language',  'The best non-English language cinema',         '🌍'),
  ('oscar-winners',  'Oscar Winners',      'Academy Award Best Picture winners',           '🏆'),
  ('critically-acclaimed', 'Critically Acclaimed', 'Metascore 80+ or RT 90+',             '🌟'),
  ('cult-classics',  'Cult Classics',      'Films with a devoted following',               '🛸'),
  ('short-films',    'Short Films',        'Great storytelling under 60 minutes',          '⏱️'),
  ('based-on-book',  'Based on a Book',    'Beloved novels brought to the screen',         '📚'),
  ('true-story',     'Based on True Events','Stranger than fiction',                       '📰')
ON CONFLICT (slug) DO NOTHING;
