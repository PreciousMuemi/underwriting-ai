PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE users (
	id INTEGER NOT NULL, 
	email VARCHAR(120) NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	password_hash VARCHAR(128) NOT NULL, 
	language_preference VARCHAR(2), 
	is_active BOOLEAN, 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id)
);
INSERT INTO users VALUES(2,'cynthiamuemi@gmail.com','cynthiamuemi@gmail.com','$2b$12$A2dJrRPEMbf4uFjqNZf04eCZLFKNdf7CoaBKvXpewuI5nQ.Jgu49O','en',1,'2025-08-16 01:17:34.280506','2025-08-16 01:17:34.280522');
INSERT INTO users VALUES(3,'guest-2507412f08@guest.local','Guest 2f08','$2b$12$6OKSer.FrFh9oMplO76qBe1Ru6EBAgtdDinqsRAMdFtvOwuGd3nXy','en',1,'2025-08-23 07:23:19.284307','2025-08-23 07:23:19.284316');
INSERT INTO users VALUES(4,'guest-b8855d72e7@guest.local','Guest 72e7','$2b$12$IYjXcIa0SdusoUeAQA0u7e7.l4DPaxvxifcItgy7MoZPRwQLAiT.O','en',1,'2025-08-23 07:59:03.893910','2025-08-23 07:59:03.893920');
INSERT INTO users VALUES(5,'preemuemi@gmail.com','Precious Muemi','$2b$12$3Y5nqFogZ0SqgEr.K5SWGe7T.bRCbX6ehnvwrWkAYswNXrrk9V3Ui','en',1,'2025-08-23 08:13:42.314458','2025-08-23 08:13:42.314466');
CREATE TABLE quotes (
	id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	input_data JSON NOT NULL, 
	risk_score INTEGER NOT NULL, 
	risk_level VARCHAR(20) NOT NULL, 
	quote_amount INTEGER NOT NULL, 
	credit_score INTEGER, 
	driving_patterns JSON, 
	created_at DATETIME, 
	email_sent BOOLEAN, 
	pdf_generated BOOLEAN, 
	pdf_path VARCHAR(255), vehicle_category VARCHAR(20), cover_type VARCHAR(20), add_ons JSON, term_months INTEGER DEFAULT 12, kyc_status VARCHAR(20) DEFAULT 'pending', valuation_required BOOLEAN DEFAULT 0, mechanical_assessment_required BOOLEAN DEFAULT 0, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);
INSERT INTO quotes VALUES(1,2,'{"ID": 1, "KIDSDRIV": 6, "BIRTH": 2003, "AGE": 22, "HOMEKIDS": 0, "YOJ": 0, "INCOME": 10000, "PARENT1": 0, "HOME_VAL": 0, "MSTATUS": 0, "GENDER": 0, "EDUCATION": 0, "OCCUPATION": 0, "TRAVTIME": 0, "CAR_USE": 0, "BLUEBOOK": 0, "TIF": 3, "CAR_TYPE": 1, "RED_CAR": 0, "OLDCLAIM": 0, "CLM_FREQ": 1, "REVOKED": 0, "MVR_PTS": 0, "CLM_AMT": 0, "CAR_AGE": 0, "URBANICITY": 0}',0,'Low',8985,NULL,'null','2025-08-23 06:45:03.760501',0,0,NULL,NULL,NULL,NULL,12,'pending',0,0);
INSERT INTO quotes VALUES(2,5,'{"ID": 1, "KIDSDRIV": 9, "BIRTH": 2003, "AGE": 22, "HOMEKIDS": 0, "YOJ": 0, "INCOME": 10000, "PARENT1": 0, "HOME_VAL": 0, "MSTATUS": 0, "GENDER": 0, "EDUCATION": 0, "OCCUPATION": 0, "TRAVTIME": 0, "CAR_USE": 0, "BLUEBOOK": 0, "TIF": 0, "CAR_TYPE": 3, "RED_CAR": 0, "OLDCLAIM": 0, "CLM_FREQ": 0, "REVOKED": 0, "MVR_PTS": 0, "CLM_AMT": 0, "CAR_AGE": 0, "URBANICITY": 0, "email_send": true, "attach_pdf": true}',0,'Low',7488,NULL,'null','2025-08-23 09:05:08.699871',1,1,'C:\Users\SOOQEL~1\AppData\Local\Temp\quote_2_5_20250823_124611.pdf',NULL,NULL,NULL,12,'pending',0,0);
INSERT INTO quotes VALUES(3,5,'{"ID": 1, "KIDSDRIV": 0, "BIRTH": 2000, "AGE": 25, "HOMEKIDS": 0, "YOJ": 0, "INCOME": 0, "PARENT1": 0, "HOME_VAL": 0, "MSTATUS": 0, "GENDER": 0, "EDUCATION": 0, "OCCUPATION": 0, "TRAVTIME": 240, "CAR_USE": 1, "BLUEBOOK": 0, "TIF": 0, "CAR_TYPE": 1, "RED_CAR": 0, "OLDCLAIM": 0, "CLM_FREQ": 5, "REVOKED": 0, "MVR_PTS": 0, "CLM_AMT": 0, "CAR_AGE": 2, "URBANICITY": 1, "email_send": true, "attach_pdf": true}',0,'Low',11520,NULL,'null','2025-08-23 09:10:37.092007',1,0,NULL,NULL,NULL,NULL,12,'pending',0,0);
INSERT INTO quotes VALUES(4,2,'{"ID": 1, "KIDSDRIV": 0, "BIRTH": 2003, "AGE": 22, "HOMEKIDS": 0, "YOJ": 0, "INCOME": 0, "PARENT1": 0, "HOME_VAL": 0, "MSTATUS": 0, "GENDER": 0, "EDUCATION": 0, "OCCUPATION": 0, "TRAVTIME": 240, "CAR_USE": 0, "BLUEBOOK": 0, "TIF": 0, "CAR_TYPE": 1, "RED_CAR": 0, "OLDCLAIM": 0, "CLM_FREQ": 2, "REVOKED": 0, "MVR_PTS": 0, "CLM_AMT": 0, "CAR_AGE": 3, "URBANICITY": 1, "email_send": true, "attach_pdf": true}',0,'Low',10483,NULL,'null','2025-08-23 12:12:23.636053',1,1,'C:\Users\SOOQEL~1\AppData\Local\Temp\quote_4_2_20250823_151223.pdf',NULL,NULL,NULL,12,'pending',0,0);
INSERT INTO quotes VALUES(5,2,'{"vehicle_category": "Private", "cover_type": "TPO", "term_months": 1, "add_ons": [], "coverage": {"vehicle_year": 2016}, "ID": 1, "KIDSDRIV": 0, "BIRTH": 2003, "AGE": 22, "HOMEKIDS": 0, "YOJ": 0, "INCOME": 0, "PARENT1": 0, "HOME_VAL": 0, "MSTATUS": 0, "GENDER": 0, "EDUCATION": 0, "OCCUPATION": 0, "TRAVTIME": 240, "CAR_USE": 0, "BLUEBOOK": 0, "TIF": 0, "CAR_TYPE": 1, "RED_CAR": 0, "OLDCLAIM": 0, "CLM_FREQ": 0, "REVOKED": 0, "MVR_PTS": 0, "CLM_AMT": 0, "CAR_AGE": 2, "URBANICITY": 1, "email_send": true, "attach_pdf": true}',0,'Low',7488,NULL,'null','2025-08-24 09:09:58.357094',0,1,'C:\Users\SOOQEL~1\AppData\Local\Temp\quote_5_2_20250824_120958.pdf','Private','TPO','[]',1,'pending',0,0);
INSERT INTO quotes VALUES(6,2,'{"vehicle_category": "Private", "cover_type": "TPO", "term_months": 1, "add_ons": [], "coverage": {"vehicle_year": 2016}, "ID": 1, "KIDSDRIV": 0, "BIRTH": 2003, "AGE": 22, "HOMEKIDS": 0, "YOJ": 0, "INCOME": 0, "PARENT1": 0, "HOME_VAL": 0, "MSTATUS": 0, "GENDER": 0, "EDUCATION": 0, "OCCUPATION": 0, "TRAVTIME": 240, "CAR_USE": 0, "BLUEBOOK": 0, "TIF": 0, "CAR_TYPE": 1, "RED_CAR": 0, "OLDCLAIM": 0, "CLM_FREQ": 0, "REVOKED": 0, "MVR_PTS": 0, "CLM_AMT": 0, "CAR_AGE": 1, "URBANICITY": 0, "email_send": true, "attach_pdf": true}',0,'Low',7488,NULL,'null','2025-08-24 09:15:37.055508',0,1,'C:\Users\SOOQEL~1\AppData\Local\Temp\quote_6_2_20250824_121537.pdf','Private','TPO','[]',1,'pending',0,0);
INSERT INTO quotes VALUES(7,2,'{"vehicle_category": "Private", "cover_type": "TPO", "term_months": 3, "add_ons": [], "coverage": {"vehicle_year": 2016}, "ID": 1, "KIDSDRIV": 0, "BIRTH": 2003, "AGE": 22, "HOMEKIDS": 0, "YOJ": 0, "INCOME": 0, "PARENT1": 0, "HOME_VAL": 0, "MSTATUS": 0, "GENDER": 0, "EDUCATION": 0, "OCCUPATION": 0, "TRAVTIME": 240, "CAR_USE": 0, "BLUEBOOK": 0, "TIF": 0, "CAR_TYPE": 1, "RED_CAR": 0, "OLDCLAIM": 0, "CLM_FREQ": 0, "REVOKED": 0, "MVR_PTS": 0, "CLM_AMT": 0, "CAR_AGE": 1, "URBANICITY": 1, "email_send": true, "attach_pdf": true}',0,'Low',7488,NULL,'null','2025-08-24 09:24:55.193223',0,1,'C:\Users\SOOQEL~1\AppData\Local\Temp\quote_7_2_20250824_122455.pdf','Private','TPO','[]',3,'pending',0,0);
INSERT INTO quotes VALUES(8,2,'{"vehicle_category": "Private", "cover_type": "TPO", "term_months": 6, "add_ons": [], "coverage": {"vehicle_year": 2016}, "ID": 1, "KIDSDRIV": 0, "BIRTH": 2003, "AGE": 22, "HOMEKIDS": 0, "YOJ": 0, "INCOME": 0, "PARENT1": 0, "HOME_VAL": 0, "MSTATUS": 0, "GENDER": 0, "EDUCATION": 0, "OCCUPATION": 0, "TRAVTIME": 240, "CAR_USE": 0, "BLUEBOOK": 0, "TIF": 0, "CAR_TYPE": 1, "RED_CAR": 0, "OLDCLAIM": 0, "CLM_FREQ": 0, "REVOKED": 0, "MVR_PTS": 0, "CLM_AMT": 0, "CAR_AGE": 3, "URBANICITY": 1, "email_send": true, "attach_pdf": true}',0,'Low',7488,NULL,'null','2025-08-24 09:33:36.244166',0,1,'C:\Users\SOOQEL~1\AppData\Local\Temp\quote_8_2_20250824_123336.pdf','Private','TPO','[]',6,'pending',0,0);
INSERT INTO quotes VALUES(9,2,'{"vehicle_category": "Private", "cover_type": "TPFT", "term_months": 12, "add_ons": [], "coverage": {"vehicle_year": 2019}, "ID": 1, "KIDSDRIV": 0, "BIRTH": 2004, "AGE": 21, "HOMEKIDS": 0, "YOJ": 0, "INCOME": 0, "PARENT1": 0, "HOME_VAL": 0, "MSTATUS": 1, "GENDER": 1, "EDUCATION": 0, "OCCUPATION": 0, "TRAVTIME": 240, "CAR_USE": 1, "BLUEBOOK": 0, "TIF": 0, "CAR_TYPE": 2, "RED_CAR": 0, "OLDCLAIM": 0, "CLM_FREQ": 0, "REVOKED": 0, "MVR_PTS": 0, "CLM_AMT": 0, "CAR_AGE": 5, "URBANICITY": 0, "email_send": true, "attach_pdf": true}',0,'Low',7488,NULL,'null','2025-08-24 09:43:48.752189',0,1,'C:\Users\SOOQEL~1\AppData\Local\Temp\quote_9_2_20250824_124348.pdf','Private','TPFT','[]',12,'pending',0,0);
INSERT INTO quotes VALUES(10,2,'{"vehicle_category": "PSV", "cover_type": "TPO", "term_months": 3, "add_ons": [], "coverage": {"vehicle_year": 2016}, "ID": 1, "KIDSDRIV": 0, "BIRTH": 1998, "AGE": 27, "HOMEKIDS": 0, "YOJ": 0, "INCOME": 0, "PARENT1": 0, "HOME_VAL": 0, "MSTATUS": 1, "GENDER": 1, "EDUCATION": 0, "OCCUPATION": 0, "TRAVTIME": 240, "CAR_USE": 1, "BLUEBOOK": 0, "TIF": 0, "CAR_TYPE": 1, "RED_CAR": 0, "OLDCLAIM": 1, "CLM_FREQ": 3, "REVOKED": 0, "MVR_PTS": 0, "CLM_AMT": 1, "CAR_AGE": 2, "URBANICITY": 1, "email_send": true, "attach_pdf": true}',0,'Low',9216,NULL,'null','2025-08-24 09:52:51.985886',0,1,'C:\Users\SOOQEL~1\AppData\Local\Temp\quote_10_2_20250824_125252.pdf','PSV','TPO','[]',3,'verified',0,0);
INSERT INTO quotes VALUES(11,2,'{"vehicle_category": "Motorcycles", "cover_type": "TPO", "term_months": 12, "add_ons": [], "coverage": {"vehicle_year": 2015}, "ID": 1, "KIDSDRIV": 0, "BIRTH": 2001, "AGE": 24, "HOMEKIDS": 0, "YOJ": 0, "INCOME": 0, "PARENT1": 0, "HOME_VAL": 0, "MSTATUS": 1, "GENDER": 1, "EDUCATION": 0, "OCCUPATION": 0, "TRAVTIME": 240, "CAR_USE": 1, "BLUEBOOK": 0, "TIF": 0, "CAR_TYPE": 2, "RED_CAR": 0, "OLDCLAIM": 4, "CLM_FREQ": 0, "REVOKED": 0, "MVR_PTS": 0, "CLM_AMT": 4, "CAR_AGE": 0, "URBANICITY": 0, "email_send": true, "attach_pdf": true}',0,'Low',7488,NULL,'null','2025-08-24 10:00:56.473432',0,1,'C:\Users\SOOQEL~1\AppData\Local\Temp\quote_11_2_20250824_130056.pdf','Motorcycles','TPO','[]',12,'pending',0,0);
INSERT INTO quotes VALUES(12,2,'{"vehicle_category": "Commercial", "cover_type": "TPO", "term_months": 3, "add_ons": [], "coverage": {"vehicle_year": 2019}, "ID": 1, "KIDSDRIV": 0, "BIRTH": 1998, "AGE": 27, "HOMEKIDS": 0, "YOJ": 0, "INCOME": 0, "PARENT1": 0, "HOME_VAL": 0, "MSTATUS": 1, "GENDER": 1, "EDUCATION": 0, "OCCUPATION": 0, "TRAVTIME": 240, "CAR_USE": 1, "BLUEBOOK": 0, "TIF": 0, "CAR_TYPE": 3, "RED_CAR": 0, "OLDCLAIM": 0, "CLM_FREQ": 0, "REVOKED": 0, "MVR_PTS": 0, "CLM_AMT": 0, "CAR_AGE": 1, "URBANICITY": 0, "email_send": true, "attach_pdf": true}',0,'Low',5760,NULL,'null','2025-08-24 10:07:05.272138',0,1,'C:\Users\SOOQEL~1\AppData\Local\Temp\quote_12_2_20250824_130705.pdf','Commercial','TPO','[]',3,'pending',0,0);
INSERT INTO quotes VALUES(13,2,'{"vehicle_category": "Commercial", "cover_type": "TPO", "term_months": 3, "add_ons": [], "coverage": {"vehicle_year": 2019}, "ID": 1, "KIDSDRIV": 0, "BIRTH": 2003, "AGE": 22, "HOMEKIDS": 0, "YOJ": 0, "INCOME": 0, "PARENT1": 0, "HOME_VAL": 0, "MSTATUS": 1, "GENDER": 1, "EDUCATION": 0, "OCCUPATION": 0, "TRAVTIME": 240, "CAR_USE": 1, "BLUEBOOK": 0, "TIF": 0, "CAR_TYPE": 0, "RED_CAR": 0, "OLDCLAIM": 0, "CLM_FREQ": 0, "REVOKED": 0, "MVR_PTS": 0, "CLM_AMT": 0, "CAR_AGE": 2, "URBANICITY": 0, "email_send": true, "attach_pdf": true}',0,'Low',7488,NULL,'null','2025-08-24 10:45:42.050544',0,1,'C:\Users\SOOQEL~1\AppData\Local\Temp\quote_13_2_20250824_134542.pdf','Commercial','TPO','[]',3,'pending',0,0);
INSERT INTO quotes VALUES(14,2,'{"vehicle_category": "Private", "cover_type": "TPO", "term_months": 12, "add_ons": [], "coverage": {"vehicle_year": 2019}, "ID": 1, "KIDSDRIV": 0, "BIRTH": 2004, "AGE": 21, "HOMEKIDS": 0, "YOJ": 0, "INCOME": 0, "PARENT1": 0, "HOME_VAL": 0, "MSTATUS": 1, "GENDER": 1, "EDUCATION": 0, "OCCUPATION": 0, "TRAVTIME": 240, "CAR_USE": 1, "BLUEBOOK": 0, "TIF": 0, "CAR_TYPE": 0, "RED_CAR": 0, "OLDCLAIM": 0, "CLM_FREQ": 0, "REVOKED": 0, "MVR_PTS": 0, "CLM_AMT": 0, "CAR_AGE": 2, "URBANICITY": 1, "email_send": true, "attach_pdf": true}',0,'Low',7488,NULL,'null','2025-08-24 11:03:45.246896',0,1,'C:\Users\SOOQEL~1\AppData\Local\Temp\quote_14_2_20250824_140345.pdf','Private','TPO','[]',12,'pending',0,0);
CREATE TABLE alembic_version (
	version_num VARCHAR(32) NOT NULL, 
	CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);
INSERT INTO alembic_version VALUES('13c2128081b6');
CREATE TABLE conversations (
	id VARCHAR(36) NOT NULL, 
	user_id INTEGER, 
	data JSON, 
	questions JSON, 
	"index" INTEGER, 
	status VARCHAR(20), 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);
INSERT INTO conversations VALUES('60b0dfc9-8255-479a-831e-c897142b7a6e',2,'{"messages": [{"sender": "user", "text": "PSV", "ts": "2025-08-24T10:23:39.561938Z"}]}','[{"field": "AGE", "question": "What is your age?", "type": "number"}, {"field": "CAR_USE", "question": "Is the car for commercial(1) or private(0) use?", "type": "select", "options": [0, 1]}, {"field": "BLUEBOOK", "question": "Estimated car value (USD)?", "type": "number"}]',0,'in_progress','2025-08-24 10:23:26.476232','2025-08-24 10:23:46.442675');
INSERT INTO conversations VALUES('a107056f-7a57-4c8a-90c6-9f7135b71f5c',2,'{}','[{"field": "AGE", "question": "What is your age?", "type": "number"}, {"field": "CAR_USE", "question": "Is the car for commercial(1) or private(0) use?", "type": "select", "options": [0, 1]}, {"field": "BLUEBOOK", "question": "Estimated car value (USD)?", "type": "number"}]',0,'in_progress','2025-08-24 10:31:35.602128','2025-08-24 10:31:35.602135');
INSERT INTO conversations VALUES('5609d3ba-323f-4e4d-80ed-99e71f3ca992',2,'{}','[{"field": "AGE", "question": "What is your age?", "type": "number"}, {"field": "CAR_USE", "question": "Is the car for commercial(1) or private(0) use?", "type": "select", "options": [0, 1]}, {"field": "BLUEBOOK", "question": "Estimated car value (USD)?", "type": "number"}]',0,'in_progress','2025-08-24 10:31:35.627052','2025-08-24 10:31:35.627059');
INSERT INTO conversations VALUES('cd365b73-1a8b-4a84-86a7-d48ccd0661bd',2,'{"messages": [{"sender": "user", "text": "Commercial", "ts": "2025-08-24T10:39:09.033457Z"}]}','[{"field": "AGE", "question": "What is your age?", "type": "number"}, {"field": "CAR_USE", "question": "Is the car for commercial(1) or private(0) use?", "type": "select", "options": [0, 1]}, {"field": "BLUEBOOK", "question": "Estimated car value (USD)?", "type": "number"}]',0,'in_progress','2025-08-24 10:34:22.842959','2025-08-24 10:45:45.671195');
INSERT INTO conversations VALUES('bdddf531-ff3f-45a9-942c-c35d09c38df6',2,'{}','[{"field": "AGE", "question": "What is your age?", "type": "number"}, {"field": "CAR_USE", "question": "Is the car for commercial(1) or private(0) use?", "type": "select", "options": [0, 1]}, {"field": "BLUEBOOK", "question": "Estimated car value (USD)?", "type": "number"}]',0,'in_progress','2025-08-24 10:34:22.877577','2025-08-24 10:34:22.877583');
INSERT INTO conversations VALUES('342d74f4-bd8b-4832-a597-e43507851010',2,'{}','[{"field": "AGE", "question": "What is your age?", "type": "number"}, {"field": "CAR_USE", "question": "Is the car for commercial(1) or private(0) use?", "type": "select", "options": [0, 1]}, {"field": "BLUEBOOK", "question": "Estimated car value (USD)?", "type": "number"}]',0,'in_progress','2025-08-24 10:47:23.575867','2025-08-24 10:47:23.575875');
INSERT INTO conversations VALUES('a5797abf-4aab-4c29-beaa-4bf3ce71d850',2,'{"messages": [{"sender": "user", "text": "Private", "ts": "2025-08-24T10:47:58.498216Z"}]}','[{"field": "AGE", "question": "What is your age?", "type": "number"}, {"field": "CAR_USE", "question": "Is the car for commercial(1) or private(0) use?", "type": "select", "options": [0, 1]}, {"field": "BLUEBOOK", "question": "Estimated car value (USD)?", "type": "number"}]',0,'in_progress','2025-08-24 10:47:23.600556','2025-08-24 10:58:17.204359');
INSERT INTO conversations VALUES('dfe624f8-ed32-4f2e-a247-5857a19ff1e9',2,'{"messages": [{"sender": "user", "text": "Private", "ts": "2025-08-24T11:02:18.847256Z"}]}','[{"field": "AGE", "question": "What is your age?", "type": "number"}, {"field": "CAR_USE", "question": "Is the car for commercial(1) or private(0) use?", "type": "select", "options": [0, 1]}, {"field": "BLUEBOOK", "question": "Estimated car value (USD)?", "type": "number"}]',0,'in_progress','2025-08-24 11:02:08.267875','2025-08-24 11:04:29.995558');
INSERT INTO conversations VALUES('2cfd0952-569f-4d81-8039-49086122c15d',2,'{}','[{"field": "AGE", "question": "What is your age?", "type": "number"}, {"field": "CAR_USE", "question": "Is the car for commercial(1) or private(0) use?", "type": "select", "options": [0, 1]}, {"field": "BLUEBOOK", "question": "Estimated car value (USD)?", "type": "number"}]',0,'in_progress','2025-08-25 02:40:08.581157','2025-08-25 02:40:08.581173');
CREATE TABLE policies (
	id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	quote_id INTEGER NOT NULL, 
	policy_number VARCHAR(64) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	premium INTEGER NOT NULL, 
	coverage JSON, 
	effective_date DATETIME NOT NULL, 
	expiry_date DATETIME NOT NULL, 
	created_at DATETIME, 
	issued_at DATETIME, vehicle_category VARCHAR(20), cover_type VARCHAR(20), add_ons JSON, term_months INTEGER DEFAULT 12, kyc_status VARCHAR(20) DEFAULT 'pending', valuation_required BOOLEAN DEFAULT 0, mechanical_assessment_required BOOLEAN DEFAULT 0, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	FOREIGN KEY(quote_id) REFERENCES quotes (id), 
	UNIQUE (policy_number)
);
INSERT INTO policies VALUES(1,2,4,'POL-2-4-20250823121253','issued',10483,'{}','2025-08-23 12:12:53.231802','2026-08-23 12:12:53.231802','2025-08-23 12:12:53.234365','2025-08-23 12:13:03.353174',NULL,NULL,NULL,12,'pending',0,0);
INSERT INTO policies VALUES(2,2,5,'POL-2-5-20250824091029','bound',7488,'{}','2025-08-24 09:10:29.622560','2026-08-24 09:10:29.622560','2025-08-24 09:10:29.627581',NULL,'Private','TPO','[]',1,'pending',0,0);
INSERT INTO policies VALUES(3,2,6,'POL-2-6-20250824091545','bound',7488,'{}','2025-08-24 09:15:45.897418','2026-08-24 09:15:45.897418','2025-08-24 09:15:45.898504',NULL,'Private','TPO','[]',1,'pending',0,0);
INSERT INTO policies VALUES(4,2,8,'POL-2-8-20250824093426','bound',7488,'{}','2025-08-24 09:34:26.091835','2026-08-24 09:34:26.091835','2025-08-24 09:34:26.094340',NULL,'Private','TPO','[]',6,'pending',0,0);
INSERT INTO policies VALUES(5,2,9,'POL-2-9-20250824094406','bound',7488,'{}','2025-08-24 09:44:06.044481','2026-08-24 09:44:06.044481','2025-08-24 09:44:06.047955',NULL,'Private','TPFT','[]',12,'pending',0,0);
INSERT INTO policies VALUES(6,2,10,'POL-2-10-20250824095302','issued',9216,'{}','2025-08-24 09:53:02.103940','2026-08-24 09:53:02.103940','2025-08-24 09:53:02.105637','2025-08-24 10:01:08.959683','PSV','TPO','[]',3,'verified',0,0);
INSERT INTO policies VALUES(7,2,12,'POL-2-12-20250824100723','bound',5760,'{}','2025-08-24 10:07:23.396909','2026-08-24 10:07:23.396909','2025-08-24 10:07:23.398392',NULL,'Commercial','TPO','[]',3,'pending',0,0);
INSERT INTO policies VALUES(8,2,14,'POL-2-14-20250824110429','bound',7488,'{"full_premium_paid": false, "proposal_form_received": false, "valuation_done": false, "mechanical_assessment_done": false, "vehicle_year": 2019}','2025-08-24 11:04:29.963556','2026-08-24 11:04:29.963556','2025-08-24 11:04:29.965623',NULL,'Private','TPO','[]',12,'pending',0,0);
CREATE UNIQUE INDEX ix_users_email ON users (email);
CREATE INDEX ix_conversations_user_id ON conversations (user_id);
COMMIT;
