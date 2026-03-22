**About the project**
A medical decision support system that leverages personalized patient data to assess the risk of sleep disorders. The platform identifies at-risk patients and enables physicians to review and prioritize them through an intuitive dashboard with at-risk patient flagging. It supports a feedback loop where doctors can provide input to both patients and the AI system, improving model performance over time. Patients receive doctor-tailored advice when needed + AI-generated insights and recommendations based on their individual data, promoting proactive health management. By combining risk detection, clinician oversight, and personalized feedback, the system enhances early intervention and supports more informed, data-driven care. 

* Dataset we used: https://www.kaggle.com/datasets/uom190346a/sleep-health-and-lifestyle-dataset
* Our presentation slides: https://docs.google.com/presentation/d/1aT-MszOCE6KtlVAj9TnOIrd4eE-Pkw17lCFdBtafRUg/edit?usp=sharing 

# How to run the program
**FrontEnd**
1. Open the project on the cmd
2. Navigate to the Frontend folder
3. run npm install
4. run npm run dev

**BackEnd**
1. Open the project on the cmd
2. Navigate to the Backend folder
3. run pip install -r requirements.txt
4. uvicorn main:app --reload

Run the FrontEnd and BackEnd together.
