-- 1. PRE-POPULATE LOOKUP TABLES
INSERT INTO Power (power) VALUES (11), (22), (50), (120), (180);

INSERT INTO Connector (connector_id, connector_type) VALUES 
(1, 'Type 2'), 
(2, 'CCS2'), 
(3, 'CHAdeMO'), 
(4, 'CCS1'),
(5, 'Type 3A');

-- 2. INSERT STATIONS AND CHARGERS
-- Station 1: GIAGKAS - loop global
INSERT INTO Station (address, longitude, latitude, postal_code, facilities, google_maps_link, score)
VALUES ('Isiodou 7, Koropi 194 00, Greece', 23.869929, 37.87399, 19400, 'GIAGKAS - loop global', 'http://api.plugshare.com/view/location/984769', NULL);
INSERT INTO Charger (charger_id, power, connector_id, station_id, installed_at, last_checked, charger_status, current_price)
VALUES (1, 50, 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'available', 0.500);

-- Station 2: DEI blue - Lavrio Port
INSERT INTO Station (address, longitude, latitude, postal_code, facilities, google_maps_link, score)
VALUES ('Lavrion port, Lavrio 195 00, Greece', 24.056048, 37.711387, 19500, 'DEI blue - Lavrio Port', 'http://api.plugshare.com/view/location/601404', 5.6);
INSERT INTO Charger (charger_id, power, connector_id, station_id, installed_at, last_checked, charger_status, current_price) VALUES 
(2, 22, 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'available', 0.450),
(3, 22, 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'available', 0.450),
(4, 50, 2, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'available', 0.450),
(5, 50, 2, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'available', 0.450);

-- Station 3: Apollonion Bakery
INSERT INTO Station (address, longitude, latitude, postal_code, facilities, google_maps_link, score)
VALUES ('38ο χλμ Αθηνών - Σουνίου, Λαγονήσι, NA 00000', 23.870601, 37.799465, 00000, 'Apollonion Bakery', 'http://api.plugshare.com/view/location/360407', NULL);
INSERT INTO Charger (charger_id, power, connector_id, station_id, installed_at, last_checked, charger_status, current_price) VALUES 
(6, 22, 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'available', 0.400),
(7, 22, 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'available', 0.400);

-- Station 4: nrg incharge - Shell 483 Koropi
INSERT INTO Station (address, longitude, latitude, postal_code, facilities, google_maps_link, score)
VALUES ('Παραλ. Λεωφόρου Βάρης Κορωπίου 37, Koropi 194 00, Greece', 23.876094, 37.883348, 19400, 'nrg incharge - Shell 483 Koropi', 'http://api.plugshare.com/view/location/413544', 9.0);
INSERT INTO Charger (charger_id, power, connector_id, station_id, installed_at, last_checked, charger_status, current_price) VALUES 
(8, 50, 3, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'available', 0.600),
(9, 50, 2, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'available', 0.600),
(10, 22, 1, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'available', 0.600);

-- Station 5: BP Porto Rafti
INSERT INTO Station (address, longitude, latitude, postal_code, facilities, google_maps_link, score)
VALUES ('Leof. Porto Rafti 17, Porto Rafti 190 03, Griechenland', 23.994947, 37.891572, 19003, 'BP Porto Rafti', 'http://api.plugshare.com/view/location/1149587', NULL);
INSERT INTO Charger (charger_id, power, connector_id, station_id, installed_at, last_checked, charger_status, current_price) VALUES 
(11, 50, 3, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'available', 0.550),
(12, 50, 2, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'available', 0.550),
(13, 22, 1, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'available', 0.550);

-- Station 6: ppcblue - AIA Long Term Parking (P3)
INSERT INTO Station (address, longitude, latitude, postal_code, facilities, google_maps_link, score)
VALUES ('WWQV+2F Spata Loutsa, Greece', 23.943732, 37.937528, 19004, 'ppcblue - AIA Long Term Parking (P3)', 'http://api.plugshare.com/view/location/909918', NULL);
INSERT INTO Charger (charger_id, power, connector_id, station_id, installed_at, last_checked, charger_status, current_price) VALUES 
(14, 22, 1, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'available', 0.450),
(15, 22, 1, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'available', 0.450),
(16, 50, 2, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'available', 0.450),
(17, 50, 3, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'available', 0.450);

-- Station 7: Lidl Keratea
INSERT INTO Station (address, longitude, latitude, postal_code, facilities, google_maps_link, score)
VALUES ('Leof. Souniou 7, Keratea 190 01, Greece', 23.955951, 37.825744, 19001, 'Lidl Keratea', 'http://api.plugshare.com/view/location/1343218', NULL);
INSERT INTO Charger (charger_id, power, connector_id, station_id, installed_at, last_checked, charger_status, current_price)
VALUES (18, 50, 2, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'available', 0.480);

-- Station 8: ChargePlus - Pyrgos Melissourgou
INSERT INTO Station (address, longitude, latitude, postal_code, facilities, google_maps_link, score)
VALUES ('Kalívia Thorikoú, Attiki, 190 10, GRC', 23.914357, 37.787844, 19010, 'ChargePlus - Pyrgos Melissourgou', 'http://api.plugshare.com/view/location/404842', NULL);
INSERT INTO Charger (charger_id, power, connector_id, station_id, installed_at, last_checked, charger_status, current_price) VALUES 
(19, 22, 1, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'available', 0.400),
(20, 22, 1, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'available', 0.400);

-- Station 9: ChargePlus - s/m My Market Anavissos (Under Repair Example)
INSERT INTO Station (address, longitude, latitude, postal_code, facilities, google_maps_link, score)
VALUES ('Leoforos Karamanli, Anavissos, 19013, GRC', 23.948389, 37.732956, 19013, 'ChargePlus - s/m My Market Anavissos', 'http://api.plugshare.com/view/location/310974', NULL);
INSERT INTO Charger (charger_id, power, connector_id, station_id, installed_at, last_checked, charger_status, current_price) VALUES 
(21, 22, 1, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'malfunction', 0.000),
(22, 22, 1, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'malfunction', 0.000);

-- Station 10: incharge Μαρκόπουλο (Avin)
INSERT INTO Station (address, longitude, latitude, postal_code, facilities, google_maps_link, score)
VALUES ('Leof. Porto Rafti 60, Markopoulo Mesogeas 190 11, Greece', 23.943522, 37.887802, 19011, 'incharge Μαρκόπουλο (Avin)', 'http://api.plugshare.com/view/location/354500', NULL);
INSERT INTO Charger (charger_id, power, connector_id, station_id, installed_at, last_checked, charger_status, current_price) VALUES 
(23, 22, 1, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'available', 0.500),
(24, 50, 2, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'available', 0.500);