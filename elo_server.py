import requests
import math
from firebase import firebase
import datetime
from datetime import timedelta,date
from BaseHTTPServer import BaseHTTPRequestHandler,HTTPServer
import json

fb = firebase.FirebaseApplication('https://nbaelo.firebaseio.com', None)

def elo_change(team1,team2,winner):
	"""Calculate new Elo ratings of two teams 

	Keyword arguments:
	team1 -- elo rating of the first team
	team2 -- elo rating of the second team
	winner -- indicates which team won (1 = team 1, -1 = team 2)
	
	https://metinmediamath.wordpress.com/2013/11/27/how-to-calculate-the-elo-rating-including-example/
	"""
	k = 32

	team1_transform = math.pow(10,team1/400)
	team2_transform = math.pow(10,team2/400)
	transform_sum = team1_transform+team2_transform

	team1_expected = team1_transform/transform_sum
	team2_expected = team2_transform/transform_sum

	team1_coeff = 0
	team2_coeff = 0
	if (winner>0):
		team1_coeff = 1
	elif (winner<0):
		team2_coeff = 1

	team1_new = team1 + k*(team1_coeff - team1_expected)
	team2_new = team2 + k*(team2_coeff - team2_expected)

	return [int(round(team1_new)),int(round(team2_new))]

def init_setup():
	#fb = firebase.FirebaseApplication('https://nbaelo.firebaseio.com', None)
	teamslist_url = 'http://stats.nba.com/stats/leaguedashteamstats?Conference=&DateFrom=&DateTo=&Division=&GameScope=&GameSegment=&LastNGames=0&LeagueID=00&Location=&MeasureType=Base&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=2015-16&SeasonSegment=&SeasonType=Regular+Season&ShotClockRange=&StarterBench=&TeamID=0&VsConference=&VsDivision='
	teamslist_response = requests.get(teamslist_url)
	teamslist_response.raise_for_status()
	teams = teamslist_response.json()['resultSets'][0]['rowSet']
	data = {}
	for i in range(0,len(teams)):
		team_name = teams[i][0]
		data[team_name] = 1000
	fb.post('1-18-2016',data)

def daily_update():
	one_day = datetime.timedelta(days=1)
	yesterday = date.today()-one_day
	y_month = str(yesterday.month)
	y_day = str(yesterday.day)
	y_year = str(yesterday.year)
	data = get_prev_day_ratings(y_month,y_day,y_year)
	headers = {'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.111 Safari/537.36'}
	daily_scoreboard_url = 'http://stats.nba.com/stats/scoreboardV2?DayOffset=0&LeagueID=00&gameDate='+y_month+'/'+y_day+'/'+y_year
	scoreboard_response = requests.get(daily_scoreboard_url,headers=headers)
	scoreboard_response.raise_for_status()

	#1 gets the line scores
	games = scoreboard_response.json()['resultSets'][1]['rowSet']
	for i in range(0,len(games),2):
		#3 gets the team IDs, 21 gets the points scored
		team1_id = str(games[i][3])
		team2_id = str(games[i+1][3])
		team1_score = games[i][21]
		team2_score = games[i+1][21]
		winner = 1 if team1_score>team2_score else -1
		new_ratings = elo_change(data[team1_id],data[team2_id],winner)
		data[team1_id] = new_ratings[0]
		data[team2_id] = new_ratings[1]

	#fb = firebase.FirebaseApplication('https://nbaelo.firebaseio.com', None)
	today = date.today()
	t_month = str(today.month)
	t_day = str(today.day)
	t_year = str(today.year)
	fb.post(t_month+'-'+t_day+'-'+t_year,data)

def get_prev_day_ratings(month,day,year):
	#fb = firebase.FirebaseApplication('https://nbaelo.firebaseio.com', None)
	yesterday = month+'-'+day+'-'+year
	prev_day_ratings = fb.get('/'+yesterday, None)
	keys = prev_day_ratings.keys()
	data = prev_day_ratings[keys[0]]
	return data

def update(today):
	"""Update ratings given a specific date"""
	one_day = datetime.timedelta(days=1)
	yesterday = today-one_day
	y_month = str(yesterday.month)
	y_day = str(yesterday.day)
	y_year = str(yesterday.year)
	data = get_prev_day_ratings(y_month,y_day,y_year)
	headers = {'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.111 Safari/537.36'}
	daily_scoreboard_url = 'http://stats.nba.com/stats/scoreboardV2?DayOffset=0&LeagueID=00&gameDate='+y_month+'/'+y_day+'/'+y_year
	scoreboard_response = requests.get(daily_scoreboard_url,headers=headers)
	scoreboard_response.raise_for_status()

	#1 gets the line scores
	games = scoreboard_response.json()['resultSets'][1]['rowSet']
	for i in range(0,len(games),2):
		#3 gets the team IDs, 21 gets the points scored
		team1_id = str(games[i][3])
		team2_id = str(games[i+1][3])
		team1_score = games[i][21]
		team2_score = games[i+1][21]
		winner = 1 if team1_score>team2_score else -1
		new_ratings = elo_change(data[team1_id],data[team2_id],winner)
		data[team1_id] = new_ratings[0]
		data[team2_id] = new_ratings[1]
		
	t_month = str(today.month)
	t_day = str(today.day)
	t_year = str(today.year)
	fb.post(t_month+'-'+t_day+'-'+t_year,data)

def daterange(start_date, end_date):
    for n in range(int ((end_date - start_date).days)):
        yield start_date + timedelta(n)

def one_time_update():
	"""Used to create the initial database (simulate going through many daily updates)"""
	start_date = date(2015,12,31)
	end_date = date(2016,1,30)
	for single_date in daterange(start_date,end_date):
		update(single_date)

one_time_update()
