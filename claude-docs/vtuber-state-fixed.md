```mermaid
stateDiagram-v2
    [*] --> Neutral
    
    Neutral --> Excited: New Bid
    Excited --> Happy: Bid Confirmed
    Happy --> Neutral: After 5s
    
    Neutral --> Thoughtful: Low Activity
    Thoughtful --> Neutral: New Activity
    
    Neutral --> Surprised: High Bid
    Surprised --> Happy: Bid Confirmed
    
    Happy --> Triumphant: Auction Won
    Triumphant --> Neutral: After Celebration
    
    Neutral --> Concerned: Invalid Bid
    Concerned --> Neutral: Issue Resolved
    ```