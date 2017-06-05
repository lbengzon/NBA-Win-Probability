from create_classifier_model import parse_csv, getSecondsPassed
import csv
from sklearn import tree, preprocessing, ensemble, neural_network
from sklearn.externals import joblib
import re
import json

def main():
    create_csv()

def create_csv():
    #get the pickles that were saved when you created and trained the model and encoder
    classifier_model = joblib.load("winProbabilityMLP.pkl")
    encoder = joblib.load("winProbabilityEncoder.pkl")

    #parse the csv for the feature vectors
    pbp_csv = 'pbp_single_game.csv'
    x, y, full_features = parse_csv(pbp_csv)

    #encode the feature vectors
    encoded_x = encoder.transform(x)

    #use the pickled model to predict the outcome of each feature vector
    predicted_y = list(classifier_model.predict_proba(encoded_x))

    #export the predictions to a csv file
    export_result_as_json(predicted_y, full_features)

def export_result_as_json(predicted_y, full_features):
    #open the file you will write the prediction to

    with open('single_game_prediction.json', 'w') as file:
        header = ['away_percentage', 'home_percentage', 'sequence_id','game_id','period','play_clock','home_description','away_description','score','player1_id','player1_name','player1_team','player2_id','player2_name','player2_team','player3_id','player3_name','player3_team','event_type','event_description']

        full_xy = [[a[0], a[1]] + b for a, b in zip(predicted_y, full_features)]
        json_data = []
        for feature_vector in full_xy:
            play_json = {a : b for a,b in zip(header, feature_vector)}
            period = int(feature_vector[4])
            play_clock = feature_vector[5]
            play_json['time_passed'] = getSecondsPassed(period, play_clock)
            json_data.append(play_json)
        json.dump(json_data, file)


if __name__ == "__main__":
    main()