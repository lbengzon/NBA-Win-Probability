import json
import requests

def get_elo():
	elo_url = 'http://sagarin.com/sports/nbasend.htm#New_Feature'
	scoreboard_response = requests.get(elo_url)
	print(scoreboard_response.json())

def main():
	get_elo()

if __name__ == '__main__':
	main()