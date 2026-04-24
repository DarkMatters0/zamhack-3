-- Enhancement 1: add region column
ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS region text;

-- Enhancement 2: seed region data for all seeded universities
UPDATE public.universities
SET region = CASE name
  -- NCR
  WHEN 'University of the Philippines Diliman'           THEN 'NCR'
  WHEN 'University of the Philippines Manila'            THEN 'NCR'
  WHEN 'De La Salle University'                          THEN 'NCR'
  WHEN 'Ateneo de Manila University'                     THEN 'NCR'
  WHEN 'University of Santo Tomas'                       THEN 'NCR'
  WHEN 'Far Eastern University'                          THEN 'NCR'
  WHEN 'Mapúa University'                                THEN 'NCR'
  WHEN 'Polytechnic University of the Philippines'       THEN 'NCR'
  WHEN 'University of the East'                          THEN 'NCR'
  WHEN 'Adamson University'                              THEN 'NCR'
  WHEN 'San Beda University'                             THEN 'NCR'
  WHEN 'Letran College'                                  THEN 'NCR'
  WHEN 'Pamantasan ng Lungsod ng Maynila'                THEN 'NCR'
  WHEN 'National University Philippines'                 THEN 'NCR'
  WHEN 'Philippine Normal University'                    THEN 'NCR'
  WHEN 'Philippine Women''s University'                  THEN 'NCR'
  WHEN 'University of Asia and the Pacific'              THEN 'NCR'
  WHEN 'Miriam College'                                  THEN 'NCR'
  WHEN 'Assumption College'                              THEN 'NCR'
  WHEN 'College of Saint Benilde'                        THEN 'NCR'
  WHEN 'Benilde'                                         THEN 'NCR'
  WHEN 'Lyceum of the Philippines University'            THEN 'NCR'
  WHEN 'AMACC'                                           THEN 'NCR'
  WHEN 'AMA Computer University'                         THEN 'NCR'
  WHEN 'STI College'                                     THEN 'NCR'
  WHEN 'Systems Technology Institute'                    THEN 'NCR'
  WHEN 'Informatics College'                             THEN 'NCR'
  WHEN 'Philippine Science High School'                  THEN 'NCR'
  -- CAR
  WHEN 'Saint Louis University'                          THEN 'CAR'
  WHEN 'University of the Cordilleras'                   THEN 'CAR'
  WHEN 'Baguio Central University'                       THEN 'CAR'
  WHEN 'Saint Louis University Baguio'                   THEN 'CAR'
  WHEN 'Benguet State University'                        THEN 'CAR'
  -- Region I
  WHEN 'University of Northern Philippines'              THEN 'Region I'
  WHEN 'Mariano Marcos State University'                 THEN 'Region I'
  WHEN 'Don Mariano Marcos Memorial State University'    THEN 'Region I'
  -- Region III
  WHEN 'Nueva Ecija University of Science and Technology' THEN 'Region III'
  WHEN 'Central Luzon State University'                  THEN 'Region III'
  WHEN 'Holy Angel University'                           THEN 'Region III'
  WHEN 'Angeles University Foundation'                   THEN 'Region III'
  WHEN 'Pampanga State Agricultural University'          THEN 'Region III'
  WHEN 'Tarlac State University'                         THEN 'Region III'
  WHEN 'Bataan Peninsula State University'               THEN 'Region III'
  -- Region IV-A
  WHEN 'University of the Philippines Los Baños'         THEN 'Region IV-A'
  WHEN 'Cavite State University'                         THEN 'Region IV-A'
  WHEN 'Laguna State Polytechnic University'             THEN 'Region IV-A'
  WHEN 'Batangas State University'                       THEN 'Region IV-A'
  WHEN 'De La Salle University Dasmariñas'               THEN 'Region IV-A'
  WHEN 'University of Batangas'                          THEN 'Region IV-A'
  -- Region IV-B
  WHEN 'Palawan State University'                        THEN 'Region IV-B'
  WHEN 'Western Philippines University'                  THEN 'Region IV-B'
  -- Region V
  WHEN 'Bicol University'                                THEN 'Region V'
  WHEN 'Ateneo de Naga University'                       THEN 'Region V'
  WHEN 'University of Nueva Caceres'                     THEN 'Region V'
  WHEN 'Camarines Sur Polytechnic Colleges'              THEN 'Region V'
  -- Region VI
  WHEN 'University of the Philippines Visayas'           THEN 'Region VI'
  WHEN 'West Visayas State University'                   THEN 'Region VI'
  WHEN 'Iloilo Science and Technology University'        THEN 'Region VI'
  WHEN 'Central Philippine University'                   THEN 'Region VI'
  WHEN 'University of San Agustin'                       THEN 'Region VI'
  WHEN 'John B. Lacson Foundation Maritime University'   THEN 'Region VI'
  WHEN 'Capiz State University'                          THEN 'Region VI'
  WHEN 'Aklan State University'                          THEN 'Region VI'
  -- Region VII
  WHEN 'University of the Philippines Cebu'              THEN 'Region VII'
  WHEN 'University of Cebu'                              THEN 'Region VII'
  WHEN 'University of San Carlos'                        THEN 'Region VII'
  WHEN 'Cebu Institute of Technology University'         THEN 'Region VII'
  WHEN 'Cebu Technological University'                   THEN 'Region VII'
  WHEN 'University of San Jose-Recoletos'                THEN 'Region VII'
  WHEN 'Southwestern University PHINMA'                  THEN 'Region VII'
  WHEN 'Silliman University'                             THEN 'Region VII'
  WHEN 'Saint Paul University Dumaguete'                 THEN 'Region VII'
  WHEN 'Negros Oriental State University'                THEN 'Region VII'
  WHEN 'Bohol Island State University'                   THEN 'Region VII'
  -- Region VIII
  WHEN 'Eastern Visayas State University'                THEN 'Region VIII'
  WHEN 'Leyte Normal University'                         THEN 'Region VIII'
  WHEN 'Naval State University'                          THEN 'Region VIII'
  WHEN 'University of Eastern Philippines'               THEN 'Region VIII'
  -- Region IX
  WHEN 'Zamboanga State College of Marine Sciences and Technology' THEN 'Region IX'
  WHEN 'Western Mindanao State University'               THEN 'Region IX'
  WHEN 'Ateneo de Zamboanga University'                  THEN 'Region IX'
  -- Region X
  WHEN 'Mindanao State University Iligan'                THEN 'Region X'
  WHEN 'Central Mindanao University'                     THEN 'Region X'
  WHEN 'Xavier University Ateneo de Cagayan'             THEN 'Region X'
  WHEN 'Capitol University'                              THEN 'Region X'
  WHEN 'Liceo de Cagayan University'                     THEN 'Region X'
  WHEN 'Lanao del Norte Agricultural College'            THEN 'Region X'
  -- Region XI
  WHEN 'University of the Philippines Mindanao'          THEN 'Region XI'
  WHEN 'Davao del Norte State College'                   THEN 'Region XI'
  WHEN 'Holy Cross of Davao College'                     THEN 'Region XI'
  WHEN 'Ateneo de Davao University'                      THEN 'Region XI'
  WHEN 'University of Southeastern Philippines'          THEN 'Region XI'
  WHEN 'University of Mindanao'                          THEN 'Region XI'
  WHEN 'Southern Philippines Medical Center College of Medicine' THEN 'Region XI'
  WHEN 'Mapúa Malayan Colleges Mindanao'                 THEN 'Region XI'
  -- Region XII
  WHEN 'Notre Dame of Marbel University'                 THEN 'Region XII'
  WHEN 'Notre Dame University Cotabato'                  THEN 'Region XII'
  WHEN 'Mindanao State University General Santos'        THEN 'Region XII'
  WHEN 'Sultan Kudarat State University'                 THEN 'Region XII'
  -- Region XIII
  WHEN 'Caraga State University'                         THEN 'Region XIII'
  WHEN 'Agusan del Sur State College of Agriculture and Technology' THEN 'Region XIII'
  -- BARMM
  WHEN 'Mindanao State University Marawi'                THEN 'BARMM'
  -- No region for generic entries
  ELSE NULL
END
WHERE name IN (
  'University of the Philippines Diliman',
  'University of the Philippines Manila',
  'University of the Philippines Los Baños',
  'University of the Philippines Visayas',
  'University of the Philippines Mindanao',
  'De La Salle University',
  'Ateneo de Manila University',
  'University of Santo Tomas',
  'Far Eastern University',
  'Mapúa University',
  'Polytechnic University of the Philippines',
  'University of the East',
  'Adamson University',
  'San Beda University',
  'Letran College',
  'Pamantasan ng Lungsod ng Maynila',
  'National University Philippines',
  'Philippine Normal University',
  'Philippine Women''s University',
  'Saint Louis University',
  'University of Asia and the Pacific',
  'Miriam College',
  'Assumption College',
  'College of Saint Benilde',
  'Benilde',
  'University of Northern Philippines',
  'Mariano Marcos State University',
  'Don Mariano Marcos Memorial State University',
  'University of the Cordilleras',
  'Baguio Central University',
  'Saint Louis University Baguio',
  'Benguet State University',
  'Nueva Ecija University of Science and Technology',
  'Central Luzon State University',
  'Holy Angel University',
  'Angeles University Foundation',
  'Pampanga State Agricultural University',
  'Tarlac State University',
  'Bataan Peninsula State University',
  'Cavite State University',
  'Laguna State Polytechnic University',
  'Batangas State University',
  'Lyceum of the Philippines University',
  'De La Salle University Dasmariñas',
  'University of Batangas',
  'Palawan State University',
  'Western Philippines University',
  'Bicol University',
  'Ateneo de Naga University',
  'University of Nueva Caceres',
  'Camarines Sur Polytechnic Colleges',
  'West Visayas State University',
  'Iloilo Science and Technology University',
  'Central Philippine University',
  'University of San Agustin',
  'John B. Lacson Foundation Maritime University',
  'Capiz State University',
  'Aklan State University',
  'University of the Philippines Cebu',
  'University of Cebu',
  'University of San Carlos',
  'Cebu Institute of Technology University',
  'Cebu Technological University',
  'University of San Jose-Recoletos',
  'Southwestern University PHINMA',
  'Silliman University',
  'Saint Paul University Dumaguete',
  'Negros Oriental State University',
  'Bohol Island State University',
  'Eastern Visayas State University',
  'Leyte Normal University',
  'Naval State University',
  'University of Eastern Philippines',
  'Zamboanga State College of Marine Sciences and Technology',
  'Western Mindanao State University',
  'Ateneo de Zamboanga University',
  'Mindanao State University Iligan',
  'Central Mindanao University',
  'Xavier University Ateneo de Cagayan',
  'Capitol University',
  'Liceo de Cagayan University',
  'Davao del Norte State College',
  'Holy Cross of Davao College',
  'Ateneo de Davao University',
  'University of Southeastern Philippines',
  'University of Mindanao',
  'Southern Philippines Medical Center College of Medicine',
  'Notre Dame of Marbel University',
  'Notre Dame University Cotabato',
  'Mindanao State University General Santos',
  'Sultan Kudarat State University',
  'Caraga State University',
  'Agusan del Sur State College of Agriculture and Technology',
  'Mindanao State University Marawi',
  'Lanao del Norte Agricultural College',
  'Mapúa Malayan Colleges Mindanao',
  'AMACC',
  'AMA Computer University',
  'STI College',
  'Systems Technology Institute',
  'Informatics College',
  'Philippine Science High School'
);
