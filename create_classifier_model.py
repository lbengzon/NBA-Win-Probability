import csv
from sklearn import tree, preprocessing, ensemble, neural_network
from sklearn.externals import joblib
import re

event_codes = {"Start Period ": 1,
                    "Made Shot ": 2,
                   "Turnover ": 3,
                   "Foul ": 4,
                   "Free Throw ": 5,
                   "Rebound ": 6,
                    "Missed Shot ": 7,
                    "Substitution ": 8,
                    "Jump Ball ": 9,
                    "Instant Replay ": 10,
                    "End Period ": 11,
                    "Violation ": 12,
                    "Timeout ": 13,
                    "Ejection ": 14
                   }

event_codes_to_ignore = set([1, 10, 11, 13])

home_victory = 'home'
away_victory = 'away'

away_team_play = 1
home_team_play = 0
both_team_play = 2

SCORE_REGEX = '([0-9]*) - ([0-9]*)'
CLOCK_REGEX = '([0-9]*):([0-9]*)'




def getSecondsPassed(period, play_clock):
    clock_prog = re.compile(CLOCK_REGEX)
    seconds = 0
    #calculate the seconds from the previous periods
    for p in range(1,period):
        if(p >= 5):
            seconds += 300
        else:
            seconds += 720
    clock_array = clock_prog.split(play_clock)
    minutes = int(clock_array[1])
    seconds_period = int(clock_array[2])
    seconds_passed_in_period = (300 if period > 4 else 720) - (minutes * 60 + seconds_period)
    seconds += seconds_passed_in_period
    return seconds

def get_event_code(event_type):
    if event_type in event_codes.keys():
        event_code = event_codes[event_type]
        return event_code
    else:
        print("This event type doesnt exist: " + event_type)

def parse_csv(pbp_csv):
    # create the regex for parsing the score
    score_prog = re.compile(SCORE_REGEX)

    # this set will hold all the feature vectors
    x = []
    # this set will hold all the results
    y = []
    game_results = {}
    #this will hold the full rows used (including all columns of original csv)
    full_features = []
    score = '0 - 0'
    with open(pbp_csv, 'r') as f:
        reader = csv.reader(f)
        # skip the header row
        next(reader)
        for row in reader:
            # get fields
            game_id = int(row[1])
            period = int(row[2])
            play_clock = row[3]

            # parse the score
            if (score_prog.match(row[6])):
                score = row[6]
            else:
                row[6] = score
            score_array = score_prog.split(score)
            away_score = int(score_array[1])
            home_score = int(score_array[2])

            # get event code
            event_code = get_event_code(row[16])

            # check if the game ended by checking if the event is an end period event
            # and if the period is greater than or equal to 4 (OT), and the scores are not the same
            # (which would mean that there is another OT)
            if event_code == 11 and period >= 4 and home_score != away_score:
                # if its the end of the game then add the result to the game result dictionary
                game_results[game_id] = home_victory if home_score > away_score else away_victory
            # we dont want start period, end period, or instant replay plays
            elif event_code not in event_codes_to_ignore:
                # if its not the end of the game then add the feature vector
                # Get which team the play belongs to
                home_description = row[4]
                away_description = row[5]
                if home_description == '' and away_description == '':
                    team_play = both_team_play
                elif home_description != '':
                    team_play = home_team_play
                elif away_description != '':
                    team_play = away_team_play

                # get the seconds passed since the start of the game
                seconds_passed = getSecondsPassed(period, play_clock)

                # game id is just added so that later we can find the result of the game (it will be removed later)
                x.append([game_id, seconds_passed, away_score, home_score, event_code, team_play])
                full_features.append(row)

    # for each feature vector, find the result of the game and add it to the results (y)
    for feature_vector in x:
        game_id = feature_vector[0]
        # if the game_id exists in the game results dictionary
        if game_id in game_results.keys():
            # append the result of the game
            y.append(game_results[game_id])
        else:
            # Shouldn't really happen if we have complete data
            print("============== ERROR no game result for the id " + game_id)
        # remove the game id from the feature vector because we dont want it as a feature
        feature_vector.pop(0)

    return x, y, full_features

def create_pickle():
    x, y, full_features = parse_csv('pbp.csv')

    mid = int(len(x)/ 2)
    train_x = x[:mid]
    train_y = y[:mid]

    test_x = x[mid:]
    test_y = y[mid:]

    categorical_feats = [3, 4]
    encoder = preprocessing.OneHotEncoder(categorical_features = categorical_feats)
    encoder.fit(train_x)
    train_x = encoder.transform(train_x)
    test_x = encoder.transform(test_x)

    clf = neural_network.MLPClassifier()
    clf = clf.fit(train_x, train_y)

    predicted_y = clf.predict(test_x)

    zipped = list(zip(test_y, predicted_y))
    full_xy = list(zip(predicted_y, x))
    #print(full_xy)
    #print(predicted_y)


    print(sum([1 if tu[0] == tu[1] else 0 for tu in zipped])/len(zipped))
    #print(clf.n_features_)
    joblib.dump(clf, 'winProbabilityMLP.pkl')
    joblib.dump(encoder, 'winProbabilityEncoder.pkl')

    #print(zip(test_y, predicted_y))

def main():
    create_pickle()


if __name__ == "__main__":
    main()
